/**
 * Captures "You" highlight evidence (ticket 20) at 390px and drives the
 * "Which one is you?" flow: pick, reload, still highlighted, clear.
 * Screenshots land in test-results/20-you-highlight/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3201, lends
 * XI's Anthony Conway a throwaway email for account linking, reveals XI's
 * Standings, and restores both afterwards:
 *   pnpm tsx scripts/you-evidence.ts
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

const PORT = 3201;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/20-you-highlight");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const LINKED_EMAIL = "you-evidence-linked@jahnelgroup.com";
const UNLINKED_EMAIL = "you-evidence-unlinked@jahnelgroup.com";
const LINKED_PARTICIPANT = "Anthony Conway";
const PICKED_PARTICIPANT = "Jory Hutchins";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

async function createSession(email: string): Promise<string> {
  const userId = `smoke-${randomUUID()}`;
  const token = `smoke-${randomUUID()}`;
  await query(`delete from "user" where email = $1`, [email]);
  await query(
    `insert into "user" (id, name, email, email_verified) values ($1, 'Evidence', $2, true)`,
    [userId, email],
  );
  await query(
    `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 hour')`,
    [`smoke-${randomUUID()}`, token, userId],
  );
  return encodeURIComponent(
    `${token}.${await makeSignature(token, AUTH_SECRET)}`,
  );
}

const setParticipantEmail = (email: string | null) =>
  query(
    `update participant p set email = $1 from war_week w
     where w.id = p.war_week_id and w.edition = 'xi' and p.display_name = $2`,
    [email, LINKED_PARTICIPANT],
  );

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

let failures = 0;
function check(label: string, pass: boolean) {
  console.log(`${pass ? "ok" : "FAIL"} - ${label}`);
  if (!pass) failures += 1;
}

async function evaluate<T>(page: Page, expression: string): Promise<T> {
  const { result } = await page.send<{ result: { value: T } }>(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
  );
  return result.value;
}

/** Whether every row carrying the "You" tag shows the accent ring. */
const youRowsRinged = (page: Page) =>
  evaluate<boolean>(
    page,
    `[...document.querySelectorAll('[data-you]')].every((el) => getComputedStyle(el.parentElement).boxShadow !== 'none')`,
  );

/** The names in rows carrying the "You" tag. */
const youRows = (page: Page) =>
  evaluate<string[]>(
    page,
    `[...document.querySelectorAll('[data-you]')].map((el) => el.parentElement.textContent)`,
  );

async function visit(page: Page, target: string) {
  await page.send("Page.navigate", { url: `${BASE_URL}${target}` });
  await sleep(2_500);
}

async function shoot(page: Page, file: string, scrollToYou = true) {
  if (scrollToYou) {
    await evaluate(
      page,
      `document.querySelector('[data-you]')?.scrollIntoView({ block: 'center' })`,
    );
    await sleep(300);
  }
  const { data } = await page.send<{ data: string }>("Page.captureScreenshot", {
    format: "png",
  });
  writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
  console.log(`captured ${file}`);
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const [{ standings_hidden: wasHidden }] = await query<{
    standings_hidden: boolean;
  }>(`select standings_hidden from war_week where edition = 'xi'`);
  const [{ email: originalEmail }] = await query<{ email: string | null }>(
    `select p.email from participant p join war_week w on w.id = p.war_week_id
     where w.edition = 'xi' and p.display_name = $1`,
    [LINKED_PARTICIPANT],
  );
  await query(
    `update war_week set standings_hidden = false where edition = 'xi'`,
  );
  await setParticipantEmail(LINKED_EMAIL);
  const linkedCookie = await createSession(LINKED_EMAIL);
  const unlinkedCookie = await createSession(UNLINKED_EMAIL);

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
  const dir = mkdtempSync(path.join(os.tmpdir(), "you-evidence-"));
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
        "--remote-debugging-port=9313",
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
          await fetch("http://127.0.0.1:9313/json/list")
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
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // Account linking: the session email matches a Participant.
    await setCookie(page, linkedCookie);
    await visit(page, "/xi/teams");
    const linkedTeams = await youRows(page);
    check(
      `linked: one "You" on /xi/teams, in ${LINKED_PARTICIPANT}'s row`,
      linkedTeams.length === 1 && linkedTeams[0].includes(LINKED_PARTICIPANT),
    );
    check(
      "linked: no picker",
      !(await evaluate<boolean>(
        page,
        `document.body.innerText.includes('Which one is you?')`,
      )),
    );
    check(
      "linked: the /xi/teams row has the accent ring",
      await youRowsRinged(page),
    );
    await shoot(page, "phone-teams-linked.png");
    await visit(page, "/xi/leaderboard");
    const linkedBoard = await youRows(page);
    check(
      `linked: one "You" on the individual leaderboard`,
      linkedBoard.length === 1 && linkedBoard[0].includes(LINKED_PARTICIPANT),
    );
    check(
      "linked: the leaderboard row has the accent ring",
      await youRowsRinged(page),
    );
    await shoot(page, "phone-leaderboard-linked.png");
    await visit(page, "/xi/awards");
    check(
      `linked: "You" on ${LINKED_PARTICIPANT}'s Award`,
      (await youRows(page)).some((r) => r.includes(LINKED_PARTICIPANT)),
    );
    check(
      "linked: the Award recipient row has the accent ring",
      await youRowsRinged(page),
    );
    await shoot(page, "phone-awards-linked.png");

    // Hidden Standings: no highlight, no names.
    await query(
      `update war_week set standings_hidden = true where edition = 'xi'`,
    );
    await visit(page, "/xi/leaderboard");
    check(
      'hidden: no "You" on /xi/leaderboard',
      (await youRows(page)).length === 0,
    );
    await shoot(page, "phone-leaderboard-hidden.png", false);
    await query(
      `update war_week set standings_hidden = false where edition = 'xi'`,
    );

    // No match: pick yourself, reload, still you, then clear.
    await setCookie(page, unlinkedCookie);
    await visit(page, "/xi/teams");
    check(
      'unlinked: no "You" before picking',
      (await youRows(page)).length === 0,
    );
    await shoot(page, "phone-picker.png", false);
    await evaluate(
      page,
      `(() => {
        const input = document.querySelector('input[list]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(PICKED_PARTICIPANT)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await sleep(500);
    const picked = await youRows(page);
    check(
      `unlinked: picking ${PICKED_PARTICIPANT} highlights their row`,
      picked.length === 1 && picked[0].includes(PICKED_PARTICIPANT),
    );
    await visit(page, "/xi/teams");
    const reloaded = await youRows(page);
    check(
      "unlinked: still highlighted after a reload",
      reloaded.length === 1 && reloaded[0].includes(PICKED_PARTICIPANT),
    );
    await shoot(page, "phone-teams-picked.png", false);
    check(
      "unlinked: the picked row has the accent ring",
      await youRowsRinged(page),
    );
    await shoot(page, "phone-teams-picked-row.png");
    await visit(page, "/xi/leaderboard");
    check(
      "unlinked: the pick highlights the individual leaderboard",
      (await youRows(page)).some((r) => r.includes(PICKED_PARTICIPANT)),
    );
    await shoot(page, "phone-leaderboard-picked.png");
    await visit(page, "/xi/teams");
    await evaluate(
      page,
      `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Not me'))?.click()`,
    );
    await sleep(500);
    check(
      'unlinked: "Not me / clear" removes the highlight',
      (await youRows(page)).length === 0,
    );
    check(
      "unlinked: the stored pick is gone",
      (await evaluate<string | null>(
        page,
        `localStorage.getItem('ww:you:xi')`,
      )) === null,
    );
    check(
      "unlinked: the picker is back",
      await evaluate<boolean>(
        page,
        `document.body.innerText.includes('Which one is you?')`,
      ),
    );
    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from "user" where email = any($1)`, [
      [LINKED_EMAIL, UNLINKED_EMAIL],
    ]);
    await setParticipantEmail(originalEmail);
    await query(
      `update war_week set standings_hidden = $1 where edition = 'xi'`,
      [wasHidden],
    );
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
