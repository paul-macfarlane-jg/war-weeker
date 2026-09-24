/**
 * Screenshots the Teams & roster and Competitions setup pages (ticket 26) at
 * 390px and desktop. At each width it adds a Participant through the roster's
 * "Add Participant" row, shows the refusal for deleting a Team that has
 * Participants, and captures /xi/teams with the new Participant. Each
 * capture is one viewport, scrolled to what it proves. It deletes
 * the Participant after. Screenshots land in test-results/26-setup-teams/.
 *
 * Needs a production build, the seeded local Postgres (run `pnpm smoke`
 * first), and Google Chrome. Starts its own server on port 3226:
 *   pnpm tsx scripts/setup-teams-evidence.ts
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

const PORT = 3226;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/26-setup-teams");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
// Not a smoke-% email, so a concurrent `pnpm smoke` can't delete the session.
const EMAIL = "evidence-26-organizer@jahnelgroup.com";
const PARTICIPANT = "Evidence Roster Participant";

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
 * The evidence session needs to be an Organizer to see /admin/setup, so its
 * email joins XI's allowlist until the script ends.
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "setup-teams-evidence-"));
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
        "--remote-debugging-port=9326",
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
          await fetch("http://127.0.0.1:9326/json/list")
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
    /** Captures the viewport, first scrolling `scrollTo` (JS) into view. */
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
    // Controlled inputs only see a change through the native setter.
    const fill = (form: string, name: string, value: string) =>
      evaluate<void>(`(() => {
        const input = document.querySelector('form[aria-label=${JSON.stringify(form)}] [name=${JSON.stringify(name)}]');
        const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(input, ${JSON.stringify(value)});
        input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
      })()`);

    for (const [prefix, width, height, mobile] of [
      ["phone", 390, 844, true],
      ["desktop", 1280, 900, false],
    ] as const) {
      await page.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: mobile ? 2 : 1,
        mobile,
      });

      await open("/admin/setup");
      await capture(`${prefix}-setup-landing`);

      await open("/admin/setup/teams");
      await fill("New Participant", "displayName", PARTICIPANT);
      await fill("New Participant", "companyTag", "LTI");
      const redId = await evaluate<string>(
        `[...document.querySelector('form[aria-label="New Participant"] select').options].find((o) => o.text === "Red").value`,
      );
      await fill("New Participant", "teamId", redId);
      await evaluate<void>(
        `document.querySelector('form[aria-label="New Participant"] button[type="submit"]').click()`,
      );
      await sleep(2_000);
      const added = await evaluate<boolean>(
        `!!document.querySelector('form[aria-label=${JSON.stringify(PARTICIPANT)}]')`,
      );
      if (!added) {
        const alert = await evaluate<string>(
          `document.querySelector('[role="alert"]')?.textContent ?? "no alert"`,
        );
        throw new Error(`the new Participant isn't on the roster: ${alert}`);
      }
      console.log("ok - Add Participant puts them on the roster");

      // Deleting Red (which has Participants) shows the refusal inline.
      await evaluate<void>(`(() => {
        window.confirm = () => true;
        const form = [...document.querySelectorAll('form')].find((f) => f.getAttribute('aria-label')?.endsWith(' Red'));
        [...form.querySelectorAll('button')].find((b) => b.textContent === 'Delete').click();
      })()`);
      await sleep(1_500);
      const refusal = await evaluate<string>(
        `document.querySelector('[role="alert"]')?.textContent ?? ""`,
      );
      if (!/^This .+ has \d+ Participants/.test(refusal)) {
        throw new Error(`no delete refusal: "${refusal}"`);
      }
      console.log(`ok - deleting Red is refused: ${refusal}`);
      await capture(
        `${prefix}-teams-refusal`,
        `document.querySelector('[role="alert"]')`,
      );
      await capture(
        `${prefix}-roster-added`,
        `document.querySelector('form[aria-label=${JSON.stringify(PARTICIPANT)}]')`,
      );

      await open("/xi/teams");
      const shown = await evaluate<boolean>(
        `document.body.innerText.includes(${JSON.stringify(PARTICIPANT)})`,
      );
      if (!shown) throw new Error("/xi/teams doesn't show the new Participant");
      console.log("ok - /xi/teams shows the new Participant");
      await capture(
        `${prefix}-public-teams`,
        `[...document.querySelectorAll("li")].find((li) => li.textContent.includes(${JSON.stringify(PARTICIPANT)}))`,
      );

      await open("/admin/setup/competitions");
      await capture(`${prefix}-competitions`);

      await query(`delete from participant where display_name = $1`, [
        PARTICIPANT,
      ]);
    }
    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from participant where display_name = $1`, [
      PARTICIPANT,
    ]);
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
