/**
 * Captures Reveal evidence (ticket 10): separate headless Chrome instances
 * open War Week XI while its Standings are hidden, the Standings are
 * revealed, and each browser records when its Reveal animation started.
 * Screenshots and a summary land in test-results/10-hide-and-reveal/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3200:
 *   pnpm tsx scripts/reveal-evidence.ts
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

const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/10-hide-and-reveal");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "smoke-evidence@jahnelgroup.com";
const POLL_INTERVAL_MS = 10_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
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
    `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 hour')`,
    [`smoke-${randomUUID()}`, token, userId],
  );
  return encodeURIComponent(
    `${token}.${await makeSignature(token, AUTH_SECRET)}`,
  );
}

/** A minimal Chrome DevTools Protocol client for one page. */
class Page {
  private nextId = 1;
  private pending = new Map<number, (result: unknown) => void>();

  private constructor(private ws: WebSocket) {
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      const resolve = this.pending.get(message.id);
      if (resolve) {
        this.pending.delete(message.id);
        resolve(message.error ? Promise.reject(message.error) : message.result);
      }
    });
  }

  static async connect(url: string): Promise<Page> {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new Page(ws);
  }

  send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) =>
      this.pending.set(id, resolve as (r: unknown) => void),
    );
  }

  async evaluate<T>(expression: string): Promise<T> {
    const { result } = await this.send<{ result: { value: T } }>(
      "Runtime.evaluate",
      { expression, returnByValue: true },
    );
    return result.value;
  }

  async screenshot(file: string) {
    const { data } = await this.send<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png" },
    );
    writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  }

  close() {
    this.ws.close();
  }
}

type Browser = { name: string; process: ChildProcess; dir: string; page: Page };

async function launch(
  name: string,
  debugPort: number,
  viewport: { width: number; height: number; mobile: boolean },
  cookie: string,
  target: string,
): Promise<Browser> {
  const dir = mkdtempSync(path.join(os.tmpdir(), `reveal-${name}-`));
  const child = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${dir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let wsUrl: string | undefined;
  for (let i = 0; i < 50 && !wsUrl; i++) {
    await sleep(200);
    try {
      const targets = (await (
        await fetch(`http://127.0.0.1:${debugPort}/json/list`)
      ).json()) as { type: string; webSocketDebuggerUrl: string }[];
      wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch {
      // Chrome not up yet
    }
  }
  if (!wsUrl) throw new Error(`${name}: Chrome did not start`);
  const page = await Page.connect(wsUrl);
  await page.send("Page.enable");
  await page.send("Network.enable");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  });
  await page.send("Network.setCookie", {
    name: "better-auth.session_token",
    value: cookie,
    url: BASE_URL,
    httpOnly: true,
  });
  await page.send("Page.navigate", { url: `${BASE_URL}${target}` });
  await sleep(3_000);
  return { name, process: child, dir, page };
}

const startedAt = (b: Browser) =>
  b.page.evaluate<string | null>(
    `document.querySelector("[data-reveal-started-at]")?.dataset.revealStartedAt ?? null`,
  );

async function main() {
  mkdirSync(OUT, { recursive: true });
  const log: string[] = [];
  const note = (line: string) => {
    console.log(line);
    log.push(line);
  };

  await query(
    `update war_week set standings_hidden = true where edition = 'xi'`,
  );
  if (
    await fetch(BASE_URL).then(
      () => true,
      () => false,
    )
  ) {
    throw new Error(`something is already listening on ${BASE_URL}`);
  }
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
  const browsers: Browser[] = [];

  try {
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      if (
        await fetch(`${BASE_URL}/sign-in`).then(
          (r) => r.ok,
          () => false,
        )
      ) {
        break;
      }
    }

    const projector = await launch(
      "projector",
      9301,
      { width: 1440, height: 900, mobile: false },
      cookie,
      "/xi/leaderboard",
    );
    const phone = await launch(
      "phone",
      9302,
      { width: 390, height: 844, mobile: true },
      cookie,
      "/xi",
    );
    browsers.push(projector, phone);

    for (const b of browsers) {
      const state = await b.page.evaluate<Record<string, unknown>>(
        `({ visibility: document.visibilityState,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            hidden: document.body.innerText.includes("Standings hidden") })`,
      );
      note(`${b.name} before: ${JSON.stringify(state)}`);
      await b.page.screenshot(`${b.name}-1-before.png`);
    }

    const revealedAt = Date.now();
    await query(
      `update war_week set standings_hidden = false where edition = 'xi'`,
    );
    note(`revealed at ${new Date(revealedAt).toISOString()}`);

    const starts: Record<string, number> = {};
    const midShot = new Set<string>();
    const deadline = revealedAt + POLL_INTERVAL_MS + 5_000;
    while (Date.now() < deadline && midShot.size < browsers.length) {
      for (const b of browsers) {
        if (!starts[b.name]) {
          const value = await startedAt(b);
          if (value) starts[b.name] = Number(value);
        } else if (
          !midShot.has(b.name) &&
          Date.now() - starts[b.name] > 2_500
        ) {
          const playing = await b.page.evaluate<boolean>(
            `Boolean(document.querySelector('[data-reveal="playing"]'))`,
          );
          await b.page.screenshot(`${b.name}-2-mid-reveal.png`);
          note(`${b.name} mid-reveal screenshot, playing=${playing}`);
          midShot.add(b.name);
        }
      }
      await sleep(100);
    }
    for (const b of browsers) {
      note(
        `${b.name} animation started ${starts[b.name] ? `${starts[b.name] - revealedAt} ms after the Reveal` : "NEVER"}`,
      );
    }
    const spread = Math.abs(starts.projector - starts.phone);
    note(
      `start spread between browsers: ${spread} ms (must be < ${POLL_INTERVAL_MS})`,
    );

    await sleep(8_000);
    for (const b of browsers) {
      const done = await b.page.evaluate<Record<string, unknown>>(
        `({ playing: Boolean(document.querySelector('[data-reveal="playing"]')),
            hidden: document.body.innerText.includes("Standings hidden") })`,
      );
      note(`${b.name} after: ${JSON.stringify(done)}`);
      await b.page.screenshot(`${b.name}-3-after.png`);
    }

    // Another poll later the Reveal must not play again.
    await sleep(POLL_INTERVAL_MS + 1_000);
    for (const b of browsers) {
      const again = await startedAt(b);
      note(
        `${b.name} after another poll: started-at ${again === String(starts[b.name]) ? "unchanged (played once)" : `CHANGED to ${again}`}`,
      );
    }

    // A browser that first loads after the Reveal just shows Standings.
    const late = await launch(
      "late",
      9303,
      { width: 1440, height: 900, mobile: false },
      cookie,
      "/xi/leaderboard",
    );
    browsers.push(late);
    const lateState = await late.page.evaluate<Record<string, unknown>>(
      `({ startedAt: document.querySelector("[data-reveal-started-at]")?.dataset.revealStartedAt ?? null,
          playing: Boolean(document.querySelector('[data-reveal="playing"]')),
          hidden: document.body.innerText.includes("Standings hidden") })`,
    );
    note(`late (first load after the Reveal): ${JSON.stringify(lateState)}`);
    await late.page.screenshot("late-first-load-after-reveal.png");
  } finally {
    for (const b of browsers) {
      b.page.close();
      b.process.kill();
    }
    await sleep(1_000);
    for (const b of browsers) {
      rmSync(b.dir, { recursive: true, force: true, maxRetries: 3 });
    }
    try {
      if (server.pid) process.kill(-server.pid, "SIGTERM");
    } catch {
      // server already gone
    }
    await query(
      `update war_week set standings_hidden = true where edition = 'xi'`,
    );
    await query(`delete from "user" where email = $1`, [EMAIL]);
    writeFileSync(path.join(OUT, "reveal-evidence.txt"), log.join("\n") + "\n");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
