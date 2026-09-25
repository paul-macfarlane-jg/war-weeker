/**
 * Evidence for the `other` Schedule Item category: inserts an `other` item
 * next to an existing `work` item on the XI Day, and shows it rendering with
 * neutral styling on the public schedule and offered by the Schedule Item
 * form, with no horizontal overflow. Screenshots and overflow.txt land under
 * test-results/other-category/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm db:migrate`
 * then `pnpm seed:all` first), and Google Chrome. Starts its own server on
 * port 3315:
 *   pnpm tsx scripts/other-category-evidence.ts
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

const PORT = 3315;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/other-category");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
// Not a smoke-% email, so a concurrent `pnpm smoke` can't delete the session.
const EMAIL = "evidence-ap-other@jahnelgroup.com";
const ITEM_TITLE = "Evidence: board game swap";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
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

/** The XI Day that already has a `work` Schedule Item, and that item's start time. */
async function findWorkDay(): Promise<{ dayId: string; startTime: string }> {
  const rows = await query<{ day_id: string; start_time: string }>(
    `select si.day_id, si.start_time
     from schedule_item si
     join day d on d.id = si.day_id
     join war_week w on w.id = d.war_week_id
     where w.edition = 'xi' and si.category = 'work'
     order by d.date, si.start_time
     limit 1`,
  );
  if (rows.length === 0) {
    throw new Error("no `work` Schedule Item found on the XI seed");
  }
  return { dayId: rows[0].day_id, startTime: rows[0].start_time };
}

/** Inserts the `other` evidence item at a time adjacent to the `work` item. */
async function insertOtherItem(dayId: string, workStartTime: string) {
  const [hours, minutes] = workStartTime.split(":").map(Number);
  const startTime = `${String(hours).padStart(2, "0")}:${String(minutes + 15).padStart(2, "0")}`;
  await query(
    `insert into schedule_item (day_id, start_time, title, category)
     values ($1, $2, $3, 'other')`,
    [dayId, startTime, ITEM_TITLE],
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
  const { dayId, startTime } = await findWorkDay();
  await insertOtherItem(dayId, startTime);
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "other-category-evidence-"));
  let chrome: ChildProcess | undefined;
  const overflowLines: string[] = [];

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
        "--remote-debugging-port=9315",
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
          await fetch("http://127.0.0.1:9315/json/list")
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
        mobile: width < 768,
      });
    const capture = async (name: string, scrollTo?: string) => {
      await evaluate<void>(
        scrollTo
          ? `(${scrollTo}).scrollIntoView({ block: "center" })`
          : "window.scrollTo(0, 0)",
      );
      await sleep(300);
      const { data } = await page.send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "png" },
      );
      writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
      console.log(`captured ${name}.png`);
    };
    const overflow = () =>
      evaluate<number>(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth",
      );

    // Public schedule: both the `other` and the `work` item visible together.
    await size(375, 812);
    await open("/xi/schedule");
    const shown = await evaluate<boolean>(
      `document.body.innerText.includes(${JSON.stringify(ITEM_TITLE)})`,
    );
    if (!shown) throw new Error("/xi/schedule doesn't show the Other item");
    console.log("ok - /xi/schedule shows the Other item");
    await capture(
      "schedule-375",
      `[...document.querySelectorAll("li")].find((li) => li.textContent.includes(${JSON.stringify(ITEM_TITLE)}))`,
    );
    overflowLines.push(`/xi/schedule @375: ${await overflow()}`);

    await size(1280, 900);
    await open("/xi/schedule");
    await capture(
      "schedule-1280",
      `[...document.querySelectorAll("li")].find((li) => li.textContent.includes(${JSON.stringify(ITEM_TITLE)}))`,
    );
    overflowLines.push(`/xi/schedule @1280: ${await overflow()}`);

    for (const width of [768]) {
      await size(width, 900);
      await open("/xi/schedule");
      overflowLines.push(`/xi/schedule @${width}: ${await overflow()}`);
    }

    // Organizer session: Schedule Item form offers Other.
    await setOrganizer(true);
    await size(375, 812);
    await open("/admin/setup/schedule/new");
    await evaluate<void>(`(() => {
      const select = document.querySelector('form[aria-label="Schedule Item"] select[name="category"]');
      const proto = HTMLSelectElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(select, "other");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);
    const selected = await evaluate<string>(
      `document.querySelector('form[aria-label="Schedule Item"] select[name="category"]').value`,
    );
    if (selected !== "other") {
      throw new Error(`Category select didn't select Other: ${selected}`);
    }
    console.log("ok - Schedule Item form's Category select offers Other");
    await capture(
      "form-375",
      `document.querySelector('form[aria-label="Schedule Item"] select[name="category"]')`,
    );

    for (const width of [375, 768, 1280]) {
      await size(width, 900);
      await open("/admin/setup/schedule");
      overflowLines.push(
        `/admin/setup/schedule @${width}: ${await overflow()}`,
      );
    }

    const worst = Math.max(
      ...overflowLines.map((line) => Number(line.split(": ")[1])),
    );
    writeFileSync(
      path.join(OUT, "overflow.txt"),
      overflowLines.join("\n") + "\n",
    );
    console.log(overflowLines.join("\n"));
    if (worst > 0) process.exitCode = 1;

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from schedule_item where title = $1`, [ITEM_TITLE]);
    await query(
      `delete from session where user_id in (select id from "user" where email = $1)`,
      [EMAIL],
    );
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
