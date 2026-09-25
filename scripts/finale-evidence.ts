/**
 * Evidence for brackets ticket 1 (the Finale). Captures `/xi/finale` before
 * Start, mid-countdown and in the final state at 375x812 and 1280x800, plus
 * the reduced-motion final state, and checks along the way that:
 * - it opens on Start, with no Standings rows on screen;
 * - `Space` (desktop) and a click on the stage (phone) start it;
 * - mid-countdown, last place is shown before first place;
 * - the final state shows the same totals as `/xi/leaderboard`;
 * - Replay plays it again;
 * - under `prefers-reduced-motion`, Start goes straight to the final state.
 *
 * Needs a production build, Google Chrome, and its OWN private Postgres —
 * never the shared `war_weeker` DB. Before running:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "create database war_weeker_ci_finale"
 *   export DATABASE_URL="postgres://postgres:postgres@localhost:2345/war_weeker_ci_finale?sslmode=disable"
 *   export DATABASE_DRIVER=pg
 *   pnpm db:migrate && pnpm seed:all
 *   pnpm build
 *   pnpm tsx scripts/finale-evidence.ts
 *
 * Starts its own server on port 3233, signs in as a made-up non-Organizer.
 * Screenshots and `finale.txt` land in test-results/brackets-finale/;
 * rerunning replaces it. Afterwards drop the DB and confirm nothing is left
 * on port 3233 (`lsof -ti tcp:3233 -sTCP:LISTEN`).
 */
import { loadEnvConfig } from "@next/env";
import { makeSignature } from "better-auth/crypto";
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const PORT = 3233;
const DEBUG_PORT = 9333;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/brackets-finale");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-finale-viewer@jahnelgroup.com";
/** Into the countdown for the mid shot: XI's two Teams take 2.7 s. */
const MID_MS = 700;

const dbUrl = process.env.DATABASE_URL ?? "";
if (/\/war_weeker(\?.*)?$/.test(dbUrl)) {
  console.error(
    `Refusing to run: DATABASE_URL points at the shared war_weeker DB (${dbUrl}). ` +
      "Use a private DB, e.g. war_weeker_ci_finale.",
  );
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

async function createSession(): Promise<string> {
  const userId = `smoke-${randomUUID()}`;
  const token = `smoke-${randomUUID()}`;
  await query(`delete from "user" where email = $1`, [EMAIL]);
  await query(
    `insert into "user" (id, name, email, email_verified) values ($1, 'Evidence', $2, true)`,
    [userId, EMAIL],
  );
  await query(
    `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')`,
    [`smoke-${randomUUID()}`, token, userId],
  );
  return encodeURIComponent(
    `${token}.${await makeSignature(token, AUTH_SECRET)}`,
  );
}

/** A minimal Chrome DevTools Protocol client for one page. */
async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map<number, (result: unknown) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    pending.get(message.id)?.(message.result);
    pending.delete(message.id);
  });
  return {
    send<T = Record<string, unknown>>(
      method: string,
      params: Record<string, unknown> = {},
    ): Promise<T> {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve) =>
        pending.set(id, resolve as (r: unknown) => void),
      );
    },
    close: () => ws.close(),
  };
}

type Page = Awaited<ReturnType<typeof connect>>;

async function evaluate<T>(page: Page, expression: string): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await page.send<{
      result: { value: T };
      exceptionDetails?: { exception?: { description?: string } };
    }>("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    // A navigation mid-flight can destroy the execution context, returning
    // no result at all; retry once the new context settles.
    if (!response || !response.result) {
      await sleep(300);
      continue;
    }
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ?? expression,
      );
    }
    return response.result.value;
  }
  throw new Error(`Runtime.evaluate never returned a result: ${expression}`);
}

async function setCookie(page: Page, cookie: string) {
  await page.send("Network.clearBrowserCookies");
  await page.send("Network.setCookie", {
    name: "better-auth.session_token",
    value: cookie,
    url: BASE_URL,
    httpOnly: true,
  });
}

let failures = 0;
const lines: string[] = [];
function note(line: string) {
  console.log(line);
  lines.push(line);
}
function check(label: string, pass: boolean, detail?: string) {
  note(pass ? `ok ${label}` : `FAIL ${label}${detail ? `: ${detail}` : ""}`);
  if (!pass) failures += 1;
}

async function size(page: Page, width: number, height: number) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 768,
  });
}

async function shoot(page: Page, file: string) {
  const { data } = await page.send<{ data: string }>("Page.captureScreenshot", {
    format: "png",
  });
  writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  note(`captured ${file}`);
}

async function open(page: Page, target: string) {
  await page.send("Page.navigate", { url: `${BASE_URL}${target}` });
  await sleep(2_000);
}

type FinaleState = {
  phase: string | null;
  rows: { name: string; total: string; shown: boolean }[];
  start: boolean;
  replay: boolean;
};

const STATE = `(() => {
  const root = document.querySelector("[data-finale]");
  const items = [...(root?.querySelectorAll("ol > li") ?? [])];
  const buttons = [...document.querySelectorAll("button")].map((b) => b.innerText.trim());
  return {
    phase: root?.getAttribute("data-finale") ?? null,
    rows: items.map((li) => ({
      name: li.querySelector(".font-semibold")?.textContent ?? "",
      total: li.querySelector(".tabular-nums:last-child")?.textContent ?? "",
      shown: !li.className.includes("opacity-0"),
    })),
    start: buttons.includes("Start"),
    replay: buttons.includes("Replay"),
  };
})()`;

async function leaderboardTotals(page: Page) {
  await open(page, "/xi/leaderboard");
  return evaluate<Record<string, string>>(
    page,
    `(() => {
      const list = document.querySelector("main section ol");
      return Object.fromEntries([...(list?.querySelectorAll("li") ?? [])].map((li) => [
        li.querySelector(".font-semibold")?.textContent ?? "",
        li.querySelector(".text-xl")?.textContent ?? "",
      ]));
    })()`,
  );
}

async function pressSpace(page: Page) {
  for (const type of ["keyDown", "keyUp"] as const) {
    await page.send("Input.dispatchKeyEvent", {
      type,
      key: " ",
      code: "Space",
      windowsVirtualKeyCode: 32,
      text: type === "keyDown" ? " " : undefined,
    });
  }
}

async function clickStage(page: Page) {
  // Top-left of the stage, away from the Start button.
  for (const type of ["mousePressed", "mouseReleased"] as const) {
    await page.send("Input.dispatchMouseEvent", {
      type,
      x: 20,
      y: 250,
      button: "left",
      clickCount: 1,
    });
  }
}

async function capture(
  page: Page,
  width: number,
  height: number,
  start: "space" | "click",
  expected: Record<string, string>,
) {
  await size(page, width, height);
  await open(page, "/xi/finale");

  const before = await evaluate<FinaleState>(page, STATE);
  check(
    `${width}: opens ready on Start with no Standings rows`,
    before.phase === "ready" && before.start && before.rows.length === 0,
    JSON.stringify(before),
  );
  await shoot(page, `${width}-1-before-start.png`);

  if (start === "space") await pressSpace(page);
  else await clickStage(page);
  await sleep(MID_MS);
  await shoot(page, `${width}-2-mid-countdown.png`);
  const mid = await evaluate<FinaleState>(page, STATE);
  const shown = mid.rows.map((r) => r.shown);
  check(
    `${width}: ${start} starts it; mid-countdown last place is shown before first`,
    mid.phase === "playing" &&
      shown.length > 1 &&
      shown.at(-1) === true &&
      shown[0] === false,
    JSON.stringify(mid),
  );

  await sleep(8_000);
  const done = await evaluate<FinaleState>(page, STATE);
  const totals = Object.fromEntries(done.rows.map((r) => [r.name, r.total]));
  check(
    `${width}: ends on Replay with the leaderboard's totals`,
    done.phase === "done" &&
      done.replay &&
      done.rows.every((r) => r.shown) &&
      JSON.stringify(totals) === JSON.stringify(expected),
    `${JSON.stringify(done)} expected=${JSON.stringify(expected)}`,
  );
  note(`${width}: final ${JSON.stringify(totals)}`);
  await shoot(page, `${width}-3-final.png`);

  const overflow = await evaluate<number>(
    page,
    `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
  );
  check(`${width}: no horizontal overflow`, overflow <= 0, String(overflow));

  await evaluate(
    page,
    `[...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "Replay")?.click()`,
  );
  await sleep(300);
  const replay = await evaluate<FinaleState>(page, STATE);
  check(
    `${width}: Replay plays it again`,
    replay.phase === "playing",
    JSON.stringify(replay),
  );
  await sleep(8_000);
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const cookie = await createSession();

  const server = spawn("pnpm", ["start", "-p", String(PORT)], {
    env: {
      ...process.env,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: BASE_URL,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    },
    stdio: "ignore",
    detached: true,
  });
  const dir = mkdtempSync(path.join(os.tmpdir(), "finale-evidence-"));
  let chrome: ChildProcess | undefined;

  try {
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const up = await fetch(`${BASE_URL}/sign-in`).then(
        (r) => r.ok,
        () => false,
      );
      if (up) break;
    }

    chrome = spawn(
      CHROME,
      [
        "--headless=new",
        `--remote-debugging-port=${DEBUG_PORT}`,
        `--user-data-dir=${dir}`,
        "--no-first-run",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    let wsUrl: string | undefined;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      try {
        const targets = (await (
          await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
        ).json()) as { type: string; webSocketDebuggerUrl: string }[];
        wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
      } catch {
        // Chrome is still starting.
      }
    }
    if (!wsUrl) throw new Error("Chrome did not start");
    const page = await connect(wsUrl);
    await page.send("Page.enable");
    await page.send("Network.enable");
    await page.send("Runtime.enable");
    await setCookie(page, cookie);

    await size(page, 1280, 800);
    const expected = await leaderboardTotals(page);
    note(`leaderboard Team totals: ${JSON.stringify(expected)}`);
    check(
      "the leaderboard shows Team totals",
      Object.keys(expected).length > 1,
    );

    await capture(page, 375, 812, "click", expected);
    await capture(page, 1280, 800, "space", expected);

    await page.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    for (const [width, height] of [
      [375, 812],
      [1280, 800],
    ]) {
      await size(page, width, height);
      await open(page, "/xi/finale");
      await pressSpace(page);
      await sleep(300);
      const reduced = await evaluate<FinaleState>(page, STATE);
      check(
        `${width}: reduced motion goes straight to the final state`,
        reduced.phase === "done" && reduced.rows.every((r) => r.shown),
        JSON.stringify(reduced),
      );
      await shoot(page, `${width}-4-reduced-motion-final.png`);
    }

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from "user" where email = $1`, [EMAIL]);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
    writeFileSync(path.join(OUT, "finale.txt"), lines.join("\n") + "\n");
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
