/**
 * Proves the Placement Points presets (ticket 22) at 390px: on /admin/points
 * it chooses Settlers of Catan, taps "1st · 5", checks the Points field reads
 * 5, and screenshots the form. It also checks a Competition with no presets
 * shows no buttons. Screenshots land in test-results/22-placement-presets/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3222:
 *   pnpm tsx scripts/placement-presets-evidence.ts
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

const PORT = 3222;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/22-placement-presets");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "smoke-organizer@jahnelgroup.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/**
 * The evidence session needs to be an Organizer to see /admin/points,
 * so it reuses the same allowlisted email `pnpm smoke` uses and restores the
 * allowlist afterwards.
 */
async function setOrganizer(on: boolean) {
  await query(
    on
      ? `update war_week set organizer_emails = array_append(organizer_emails, $1) where edition = 'xi' and not ($1 = any(organizer_emails))`
      : `update war_week set organizer_emails = array_remove(organizer_emails, $1) where edition = 'xi'`,
    [EMAIL],
  );
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  await setOrganizer(true);
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "placement-evidence-"));
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
        "--remote-debugging-port=9322",
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
          await fetch("http://127.0.0.1:9322/json/list")
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
    await page.send("Network.setCookie", {
      name: "better-auth.session_token",
      value: cookie,
      url: BASE_URL,
      httpOnly: true,
    });

    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await page.send("Page.navigate", { url: `${BASE_URL}/admin/points` });
    await sleep(2_500);

    const evaluate = async <T>(expression: string): Promise<T> => {
      const { result } = await page.send<{ result: { value: T } }>(
        "Runtime.evaluate",
        { expression, returnByValue: true },
      );
      return result.value;
    };
    // A controlled <select> only sees a change through the native setter.
    const choose = (name: string) =>
      evaluate<void>(`(() => {
        const select = document.querySelector('select[name="competitionId"]');
        const option = [...select.options].find((o) => o.text.startsWith(${JSON.stringify(name)}));
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, option.value);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      })()`);
    const presetButtons = () =>
      evaluate<string[]>(
        `[...document.querySelectorAll('[aria-label="Placement Points"] button')].map((b) => b.textContent)`,
      );

    await choose("Beast Mode Workout");
    await sleep(300);
    const none = await presetButtons();
    if (none.length !== 0) throw new Error(`Beast Mode shows ${none}`);
    console.log("ok - no presets for Beast Mode Workout");

    await choose("Settlers of Catan");
    await sleep(300);
    const buttons = await presetButtons();
    if (buttons.join("|") !== "1st · 5|2nd · 3|3rd · 1") {
      throw new Error(`Catan shows ${buttons}`);
    }
    await evaluate<void>(
      `[...document.querySelectorAll('[aria-label="Placement Points"] button')][0].click()`,
    );
    await sleep(300);
    const points = await evaluate<string>(
      `document.querySelector('input[name="points"]').value`,
    );
    if (points !== "5") throw new Error(`Points field reads "${points}"`);
    console.log("ok - Catan shows 1st · 5, 2nd · 3, 3rd · 1; 1st fills 5");

    const { data } = await page.send<{ data: string }>(
      "Page.captureScreenshot",
      {
        format: "png",
        captureBeyondViewport: true,
        // Just the form: the ledger below it is wider than a phone.
        clip: await evaluate<{
          x: number;
          y: number;
          width: number;
          height: number;
          scale: number;
        }>(
          `(() => { const r = document.querySelector('form[aria-label="Points Entry"]').getBoundingClientRect(); return { x: 0, y: 0, width: r.right + 16, height: r.bottom + 16, scale: 1 }; })()`,
        ),
      },
    );
    writeFileSync(
      path.join(OUT, "phone-points-presets.png"),
      Buffer.from(data, "base64"),
    );
    console.log("captured phone-points-presets.png (/admin/points)");
    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
