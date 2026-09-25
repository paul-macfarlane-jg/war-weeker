/**
 * Evidence for admin-polish deliverable D2 (admin wording): screenshots of
 * /admin and /admin/standings at 375x812 with the "public site" phrase
 * removed, and a horizontal-overflow sweep of /admin, /admin/standings and
 * /admin/points at 375, 768 and 1280px.
 *
 * Needs a production build and the seeded local Postgres (run `pnpm
 * seed:all` first) and Google Chrome. Starts its own server on port 3312:
 *   pnpm tsx scripts/admin-wording-evidence.ts
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

const PORT = 3312;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = path.resolve(process.cwd(), "test-results/admin-wording");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-ap-admin-wording@jahnelgroup.com";

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

async function setOrganizer(on: boolean) {
  await query(
    on
      ? `update war_week set organizer_emails = array_append(organizer_emails, $1) where edition = 'xi' and not ($1 = any(organizer_emails))`
      : `update war_week set organizer_emails = array_remove(organizer_emails, $1) where edition = 'xi'`,
    [EMAIL],
  );
}

async function createSession(): Promise<string> {
  const userId = `evidence-${randomUUID()}`;
  const token = `evidence-${randomUUID()}`;
  await query(`delete from "user" where email = $1`, [EMAIL]);
  await query(
    `insert into "user" (id, name, email, email_verified) values ($1, 'Evidence', $2, true)`,
    [userId, EMAIL],
  );
  await query(
    `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')`,
    [`evidence-${randomUUID()}`, token, userId],
  );
  return encodeURIComponent(
    `${token}.${await makeSignature(token, AUTH_SECRET)}`,
  );
}

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
  mkdirSync(OUT_DIR, { recursive: true });
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "admin-wording-evidence-"));
  let chrome: ChildProcess | undefined;

  try {
    await setOrganizer(true);
    const cookie = await createSession();
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
        "--remote-debugging-port=9312",
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
          await fetch("http://127.0.0.1:9312/json/list")
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

    const evaluate = async <T>(expression: string): Promise<T> => {
      const { result, exceptionDetails } = await page.send<{
        result: { value: T };
        exceptionDetails?: { exception?: { description?: string } };
      }>("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? expression);
      }
      return result.value;
    };
    const open = async (route: string) => {
      await page.send("Page.navigate", { url: `${BASE_URL}${route}` });
      await sleep(2_500);
    };
    const size = (width: number, height: number) =>
      page.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    const capture = async (name: string) => {
      await evaluate<void>("window.scrollTo(0, 0)");
      await sleep(300);
      const { data } = await page.send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "png" },
      );
      writeFileSync(
        path.join(OUT_DIR, `${name}.png`),
        Buffer.from(data, "base64"),
      );
      console.log(`captured ${name}.png`);
    };
    const overflow = () =>
      evaluate<number>(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth",
      );

    // Screenshots at 375x812.
    await size(375, 812);
    await open("/admin");
    await capture("admin-375");
    await open("/admin/standings");
    await capture("standings-375");

    // Overflow sweep at 375, 768 and 1280 across the three changed pages.
    const lines: string[] = [];
    let worst = 0;
    for (const width of [375, 768, 1280]) {
      await size(width, 900);
      for (const route of ["/admin", "/admin/standings", "/admin/points"]) {
        await open(route);
        const px = await overflow();
        worst = Math.max(worst, px);
        lines.push(`${route} @${width}: ${px}`);
        console.log(`${route} @${width}: horizontal overflow ${px}px`);
      }
    }
    writeFileSync(path.join(OUT_DIR, "overflow.txt"), lines.join("\n") + "\n");
    if (worst > 0) process.exitCode = 1;

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
