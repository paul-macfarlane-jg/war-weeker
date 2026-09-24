/**
 * Evidence for tickets 32 (themed hover colors) and 33 (tablet-width
 * overflow): hovers themed ghost/outline buttons and measures horizontal
 * overflow, saving screenshots under test-results/32-themed-hover-colors/
 * and test-results/33-tablet-width-overflow/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3232:
 *   pnpm tsx scripts/fix-32-33-evidence.ts
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

const PORT = 3232;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_32 = path.resolve(
  process.cwd(),
  "test-results/32-themed-hover-colors",
);
const OUT_33 = path.resolve(
  process.cwd(),
  "test-results/33-tablet-width-overflow",
);
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-32-organizer@jahnelgroup.com";

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
  mkdirSync(OUT_32, { recursive: true });
  mkdirSync(OUT_33, { recursive: true });
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "fix-32-33-evidence-"));
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
        "--remote-debugging-port=9332",
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
          await fetch("http://127.0.0.1:9332/json/list")
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
    const capture = async (out: string, name: string, scrollTo?: string) => {
      if (scrollTo !== "keep") {
        await evaluate<void>(
          scrollTo
            ? `(${scrollTo}).scrollIntoView({ block: "center" })`
            : "window.scrollTo(0, 0)",
        );
      }
      await sleep(300);
      const { data } = await page.send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "png" },
      );
      writeFileSync(path.join(out, `${name}.png`), Buffer.from(data, "base64"));
      console.log(`captured ${name}.png`);
    };
    const overflow = () =>
      evaluate<number>(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth",
      );

    const byText = (selector: string, text: string) =>
      `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)})`;
    // Scrolls the element into view, moves the mouse onto it so :hover
    // applies, and reports its label color on its background.
    const hover = async (element: string) => {
      await evaluate<void>(`(${element}).scrollIntoView({ block: "center" })`);
      await sleep(200);
      const { x, y } = await evaluate<{ x: number; y: number }>(
        `(() => { const r = (${element}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      );
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await sleep(400);
      return evaluate<string>(
        `(() => { const s = getComputedStyle(${element}); return s.color + " on " + s.backgroundColor; })()`,
      );
    };

    // Ticket 32: hovered ghost/outline buttons keep a readable label.
    await size(1280, 900);
    await open("/xi/schedule");
    console.log(
      `XI Sign out hovered: ${await hover(byText("button", "Sign out"))}`,
    );
    await capture(OUT_32, "01-xi-sign-out-hover", "keep");

    await open("/admin/announcements/new");
    await evaluate<void>(`(${byText("button", "Video")}).click()`);
    await sleep(500);
    console.log(
      `Video toolbar open + hovered: ${await hover(byText("button", "Video"))}`,
    );
    await capture(OUT_32, "02-toolbar-video-open-hover", "keep");
    await page.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
    });
    console.log(
      `Bold toolbar hovered: ${await hover(`document.querySelector('button[aria-label="Bold"]')`)}`,
    );
    await capture(OUT_32, "03-toolbar-bold-hover", "keep");

    await open("/x");
    const outline = `document.querySelector('[data-slot="button"].border-border')`;
    if (await evaluate<boolean>(`!!(${outline})`)) {
      console.log(`/x outline button hovered: ${await hover(outline)}`);
      await capture(OUT_32, "04-x-outline-button-hover", "keep");
    } else {
      console.log("/x has no outline button (no wiki URL seeded)");
    }

    // Ticket 33: no horizontal overflow at tablet and desktop widths.
    let worst = 0;
    for (const width of [375, 768, 812, 900, 1024, 1280]) {
      await size(width, 900);
      for (const route of ["/xi/schedule", "/admin/setup/teams"]) {
        await open(route);
        const px = await overflow();
        worst = Math.max(worst, px);
        console.log(`${route} @${width}: horizontal overflow ${px}px`);
        if (width === 812) {
          await capture(
            OUT_33,
            route === "/xi/schedule"
              ? "01-xi-schedule-812"
              : "02-setup-teams-812",
            route === "/xi/schedule"
              ? undefined
              : `document.querySelector('form[aria-label="New Participant"]')`,
          );
        }
      }
    }
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
