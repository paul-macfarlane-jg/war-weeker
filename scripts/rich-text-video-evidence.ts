/**
 * Captures rich-text video evidence (ticket 23): an Organizer inserts a
 * YouTube video from the editor toolbar (after a refused off-list URL),
 * posts the Announcement, and the embedded player shows on /xi/news.
 * Screenshots land in test-results/23-rich-text-video/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3201:
 *   pnpm tsx scripts/rich-text-video-evidence.ts
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
const OUT = path.resolve(process.cwd(), "test-results/23-rich-text-video");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "smoke-organizer@jahnelgroup.com";
const TITLE = "evidence-rich-text-video";
const VIDEO_URL = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

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
    `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 hour')`,
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
  function send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) =>
      pending.set(id, resolve as (r: unknown) => void),
    );
  }
  async function evaluate<T>(expression: string): Promise<T> {
    const { result } = await send<{ result: { value: T } }>(
      "Runtime.evaluate",
      { expression, returnByValue: true, awaitPromise: true },
    );
    return result.value;
  }
  return {
    send,
    evaluate,
    /** Focuses (and selects) the element, then types as a user would. */
    async type(selector: string, text: string) {
      const found = await evaluate<boolean>(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.focus();
        if ("select" in el) el.select();
        return true;
      })()`);
      if (!found) throw new Error(`No element for ${selector}`);
      await send("Input.insertText", { text });
      await sleep(300);
    },
    async click(selector: string) {
      const found = await evaluate<boolean>(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!found) throw new Error(`No element for ${selector}`);
      await sleep(500);
    },
    async clickButton(text: string) {
      const found = await evaluate<boolean>(`(() => {
        const el = [...document.querySelectorAll("button")].find(
          (b) => b.textContent.trim() === ${JSON.stringify(text)},
        );
        if (!el) return false;
        el.click();
        return true;
      })()`);
      if (!found) throw new Error(`No button "${text}"`);
      await sleep(500);
    },
    async shot(file: string) {
      const { data } = await send<{ data: string }>("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
      console.log(`captured ${file}`);
    },
    async viewport(mobile: boolean) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: mobile ? 390 : 1440,
        height: mobile ? 844 : 900,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile,
      });
    },
    close: () => ws.close(),
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await query(`delete from announcement where title = $1`, [TITLE]);
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "rich-text-video-evidence-"));
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
    await page.send("Runtime.enable");
    await page.send("Network.enable");
    await page.send("Network.setCookie", {
      name: "better-auth.session_token",
      value: cookie,
      url: BASE_URL,
      httpOnly: true,
    });

    // Compose the Announcement through the real editor.
    await page.viewport(false);
    await page.send("Page.navigate", {
      url: `${BASE_URL}/admin/announcements/new`,
    });
    await sleep(3_000);
    await page.type('input[name="title"]', TITLE);
    await page.type(
      '[contenteditable="true"][aria-label="Body"]',
      "Catch the kickoff recap below.",
    );
    await page.click('button[aria-label="Video"]');
    const videoField = '[role="group"][aria-label="Add video"] input';
    await page.type(videoField, "https://evil.example.com/watch?v=x");
    await page.clickButton("Insert video");
    const refusal = await page.evaluate<string | null>(
      `document.querySelector('[role="group"] [role="alert"]')?.textContent ?? null`,
    );
    if (!refusal) throw new Error("Off-list video URL was not refused");
    console.log(`refused off-list URL: "${refusal}"`);
    await page.shot("desktop-editor-refused.png");
    await page.type(videoField, VIDEO_URL);
    await page.clickButton("Insert video");
    await sleep(1_500);
    await page.shot("desktop-editor-video.png");
    await page.clickButton("Post Announcement");
    await sleep(3_000);

    const [row] = await query<{ body: unknown }>(
      `select body from announcement where title = $1`,
      [TITLE],
    );
    if (!row) throw new Error("Announcement was not saved");
    console.log(`stored body: ${JSON.stringify(row.body)}`);

    for (const mobile of [false, true]) {
      await page.viewport(mobile);
      await page.send("Page.navigate", { url: `${BASE_URL}/xi/news` });
      await sleep(4_000);
      const embeds = await page.evaluate<number>(
        `document.querySelectorAll('iframe[title="Embedded video"][src="https://www.youtube-nocookie.com/embed/jNQXAC9IVRw"]').length`,
      );
      if (embeds !== 1) {
        throw new Error(
          `Expected 1 rich-text embed on /xi/news, saw ${embeds}`,
        );
      }
      await page.shot(mobile ? "phone-news.png" : "desktop-news.png");
    }
    console.log("/xi/news renders the rich-text video embed");
    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from announcement where title = $1`, [TITLE]);
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
