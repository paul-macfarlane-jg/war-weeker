/**
 * Evidence for the admin-polish structured inputs: the Competition Group and
 * Company Tag comboboxes, Organizer email chips and Placement Points rows.
 * Captures 375px screenshots, round-trips an Organizer email and Placement
 * Points through the UI into the database (then restores them), and
 * measures horizontal overflow, all under test-results/structured-inputs/.
 *
 * Needs a production build, XI seeded (`pnpm seed:all`), and Google Chrome.
 * Starts its own server on port 3314:
 *   pnpm tsx scripts/structured-inputs-evidence.ts
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

const PORT = 3314;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/structured-inputs");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-ap-structured-inputs@jahnelgroup.com";
const NEW_ORGANIZER = "evidence-ap-new-organizer@jahnelgroup.com";
const REJECTED = "friend@gmail.com";
const ROUND_TRIP_COMPETITION = "Electric City Matrix";

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
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const log: string[] = [];
  const note = (line: string) => {
    console.log(line);
    log.push(line);
  };
  let failed = false;
  const check = (label: string, ok: boolean, detail: string) => {
    if (!ok) failed = true;
    note(`${ok ? "PASS" : "FAIL"} ${label}: ${detail}`);
  };

  const [original] = await query<{ placement_points: string[] | null }>(
    `select c.placement_points from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi' and c.name = $1`,
    [ROUND_TRIP_COMPETITION],
  );
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
  const dir = mkdtempSync(
    path.join(os.tmpdir(), "structured-inputs-evidence-"),
  );
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
        "--remote-debugging-port=9314",
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
          await fetch("http://127.0.0.1:9314/json/list")
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
      await sleep(400);
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
    // A real mouse click at the element's center, which Base UI popups need.
    const click = async (element: string, block = "center") => {
      await evaluate<void>(
        `(${element}).scrollIntoView({ block: "${block}" })`,
      );
      await sleep(250);
      const { x, y } = await evaluate<{ x: number; y: number }>(
        `(() => { const r = (${element}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`,
      );
      await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      for (const type of ["mousePressed", "mouseReleased"]) {
        await page.send("Input.dispatchMouseEvent", {
          type,
          x,
          y,
          button: "left",
          clickCount: 1,
        });
      }
      await sleep(400);
    };
    const type = async (text: string) => {
      await page.send("Input.insertText", { text });
      await sleep(200);
    };
    const press = async (key: string) => {
      await page.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key,
        code: key,
      });
      await page.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key,
        code: key,
      });
      await sleep(300);
    };
    const byText = (scope: string, selector: string, text: string) =>
      `[...(${scope}).querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.trim() === ${JSON.stringify(text)})`;
    const openItems = () =>
      evaluate<string[]>(
        `[...document.querySelectorAll('[data-slot="combobox-item"]')].map((e) => e.textContent.trim())`,
      );

    await size(375, 812);

    // Competition Group combobox, open with this War Week's groups.
    await open("/admin/setup/competitions");
    const newCompetition = `document.querySelector('form[aria-label="New Competition"]')`;
    const groupInput = `(${newCompetition}).querySelector('input[name="group"]')`;
    // The suggestion trigger button has no accessible name (fix 4), so the
    // combobox opens on an input click instead (Base UI's default
    // `openOnInputClick`).
    await click(groupInput, "start");
    const groups = await openItems();
    check(
      "Group combobox suggests this War Week's Competition Groups",
      groups.includes("Team Night Events") &&
        groups.includes("Pre-War Week and General"),
      JSON.stringify(groups),
    );
    await capture("group-375");
    await press("Escape");
    await click(groupInput);
    await type("Brand New Group");
    await press("Escape");
    const typedGroup = await evaluate<string>(`(${groupInput}).value`);
    check(
      "Group combobox keeps free text",
      typedGroup === "Brand New Group",
      JSON.stringify(typedGroup),
    );

    // Placement Points rows with an "increasing" error.
    await click(byText(newCompetition, "button", "Add place"));
    await click(byText(newCompetition, "button", "Add place"));
    const rowInput = (n: number) =>
      `(${newCompetition}).querySelectorAll('input[type="number"]')[${n}]`;
    await click(rowInput(0));
    await type("3");
    await click(rowInput(1));
    await type("5");
    const placementErrors = await evaluate<string>(
      `(${newCompetition}).querySelector("fieldset ul")?.textContent ?? ""`,
    );
    check(
      "Placement rows show the increasing error live",
      placementErrors.includes("no more than the place above it"),
      JSON.stringify(placementErrors),
    );
    await evaluate<void>(
      `(${newCompetition}).querySelector("fieldset").scrollIntoView({ block: "center" })`,
    );
    await capture("placement-375");

    // Placement Points round-trip: 5 · 3 · 1 on a Competition, saved.
    const existing = `document.querySelector('form[aria-label=${JSON.stringify(ROUND_TRIP_COMPETITION)}]')`;
    await click(byText(existing, "button", "5 · 3 · 1"));
    await click(byText(existing, "button", "Save"));
    await sleep(2_500);
    const [saved] = await query<{ placement_points: string[] | null }>(
      `select c.placement_points::float8[] as placement_points from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi' and c.name = $1`,
      [ROUND_TRIP_COMPETITION],
    );
    check(
      `competition.placement_points for ${ROUND_TRIP_COMPETITION} after 5 · 3 · 1 + Save`,
      JSON.stringify(saved?.placement_points) === "[5,3,1]",
      JSON.stringify(saved?.placement_points),
    );
    await open("/admin/setup/competitions");
    const reloadedRows = await evaluate<string[]>(
      `[...(${existing}).querySelectorAll('input[type="number"]')].map((i) => i.value)`,
    );
    check(
      "Saved Placement Points reload as rows",
      JSON.stringify(reloadedRows.map(Number)) === "[5,3,1]",
      JSON.stringify(reloadedRows),
    );

    // Company Tag combobox, open with tags from every War Week.
    await open("/admin/setup/teams");
    const tagInput = `document.querySelector('form[aria-label="New Participant"] input[name="companyTag"]')`;
    await click(tagInput, "start");
    const tags = await openItems();
    check(
      "Company Tag combobox suggests tags from any War Week",
      tags.includes("LTI"),
      JSON.stringify(tags),
    );
    await capture("tag-375");
    await press("Escape");

    // Organizer email chips: a comma entry adds one and refuses one.
    await open("/admin/setup/war-week");
    const selfRemove = await evaluate<{
      ariaDisabled: string | null;
      title: string | null;
    }>(
      `(() => { const b = document.querySelector('button[aria-label=${JSON.stringify(`Remove ${EMAIL}`)}]'); return { ariaDisabled: b?.getAttribute("aria-disabled") ?? null, title: b?.getAttribute("title") ?? null }; })()`,
    );
    check(
      "Own Organizer chip can't be removed",
      selfRemove.ariaDisabled === "true" &&
        selfRemove.title === "You can't remove your own email",
      JSON.stringify(selfRemove),
    );
    const chipInput = `document.querySelector('input[aria-labelledby="organizer-emails-label"]')`;
    await click(chipInput);
    await type(`${REJECTED}, ${NEW_ORGANIZER}`);
    const alert = await evaluate<string>(
      `(${chipInput}).parentElement.querySelector('[role="alert"]')?.textContent ?? ""`,
    );
    check(
      "Non-JG address refused inline",
      alert.includes(REJECTED),
      JSON.stringify(alert),
    );
    await evaluate<void>(
      `(${chipInput}).closest("fieldset").scrollIntoView({ block: "center" })`,
    );
    await capture("chips-375");
    await click(byText("document", "button", "Save settings"));
    await sleep(2_500);
    const [row] = await query<{ organizer_emails: string[] }>(
      `select organizer_emails from war_week where edition = 'xi'`,
    );
    check(
      "war_week.organizer_emails after adding a chip + Save",
      row.organizer_emails.includes(NEW_ORGANIZER) &&
        row.organizer_emails.includes(EMAIL) &&
        !row.organizer_emails.includes(REJECTED),
      JSON.stringify(row.organizer_emails),
    );

    // No horizontal overflow on the three setup pages.
    const overflowLines: string[] = [];
    for (const width of [375, 768, 1280]) {
      await size(width, 900);
      for (const route of [
        "/admin/setup/war-week",
        "/admin/setup/competitions",
        "/admin/setup/teams",
      ]) {
        await open(route);
        const px = await overflow();
        if (px > 0) failed = true;
        overflowLines.push(`${route} @${width}: ${px}`);
        console.log(`${route} @${width}: horizontal overflow ${px}px`);
      }
    }
    writeFileSync(
      path.join(OUT, "overflow.txt"),
      `${overflowLines.join("\n")}\n`,
    );

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(
      `update war_week set organizer_emails = array_remove(organizer_emails, $1) where edition = 'xi'`,
      [NEW_ORGANIZER],
    );
    await query(
      `update competition c set placement_points = $1 from war_week w where w.id = c.war_week_id and w.edition = 'xi' and c.name = $2`,
      [original?.placement_points ?? null, ROUND_TRIP_COMPETITION],
    );
    note("restored XI organizer_emails and placement_points");
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    writeFileSync(path.join(OUT, "log.txt"), `${log.join("\n")}\n`);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
