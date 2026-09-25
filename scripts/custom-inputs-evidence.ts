/**
 * Evidence for the custom-inputs Phase A deliverable D4 (shadcn form
 * controls). Captures every converted admin form and the "Which one is
 * you?" participant picker, in XI (live, as seeded) and in IX's dark
 * colors (background #120d1f), at 375x812 and 1280x900; proves each
 * converted form still posts the values the server expects with a
 * save-and-verify round trip; and sweeps every route for horizontal
 * overflow at 375/768/812/1024/1280.
 *
 * Needs a production build, Google Chrome, and its OWN private Postgres —
 * never the shared `war_weeker` DB, which a parallel `pnpm smoke` elsewhere
 * can wipe mid-run. Before running:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database if exists war_weeker_ci_inputs"
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "create database war_weeker_ci_inputs"
 *   export DATABASE_URL="postgres://postgres:postgres@localhost:2345/war_weeker_ci_inputs?sslmode=disable"
 *   export DATABASE_DRIVER=pg
 *   pnpm db:migrate && pnpm seed:all
 *   pnpm build
 *   pnpm tsx scripts/custom-inputs-evidence.ts
 *
 * Starts its own server on port 3231. Screenshots land under
 * test-results/custom-inputs-a-forms/ and -pages/; the overflow table lands
 * under test-results/custom-inputs-a-overflow/. Rerunning replaces those
 * three directories. Drop the private DB and confirm nothing is left on
 * port 3231 afterwards:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database war_weeker_ci_inputs"
 *   lsof -ti tcp:3231 -sTCP:LISTEN
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

const PORT = 3231;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FORMS_OUT = path.resolve(
  process.cwd(),
  "test-results/custom-inputs-a-forms",
);
const PAGES_OUT = path.resolve(
  process.cwd(),
  "test-results/custom-inputs-a-pages",
);
const OVERFLOW_OUT = path.resolve(
  process.cwd(),
  "test-results/custom-inputs-a-overflow",
);
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-inputs-organizer@jahnelgroup.com";
const NOTE = "SMOKE TEST - delete me";

const dbUrl = process.env.DATABASE_URL ?? "";
if (/\/war_weeker(\?.*)?$/.test(dbUrl)) {
  console.error(
    `Refusing to run: DATABASE_URL points at the shared war_weeker DB (${dbUrl}). ` +
      "Use a private DB, e.g. war_weeker_ci_inputs.",
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

type Page = Awaited<ReturnType<typeof connect>>;

let failures = 0;
const roundTripLines: string[] = [];
function check(label: string, pass: boolean, detail?: string) {
  const line = pass
    ? `ok ${label}`
    : `FAIL ${label}${detail ? `: ${detail}` : ""}`;
  console.log(line);
  roundTripLines.push(line);
  if (!pass) failures += 1;
}

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

async function visit(page: Page, target: string) {
  await page.send("Page.navigate", { url: `${BASE_URL}${target}` });
  await sleep(2_000);
}

async function size(page: Page, width: number, height: number) {
  await page.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
  });
}

async function shoot(page: Page, dir: string, file: string) {
  const { data } = await page.send<{ data: string }>("Page.captureScreenshot", {
    format: "png",
  });
  writeFileSync(path.join(dir, file), Buffer.from(data, "base64"));
  console.log(`captured ${file}`);
}

/**
 * Opens a single-select EntityCombobox's list by focusing its input and
 * pressing ArrowDown (Base UI opens on ArrowDown, not on a bare `.click()`
 * of the dropdown-icon button, whose `data-slot` the InputGroupButton render
 * wrapper overwrites). `index` picks which `input[role="combobox"]` inside
 * the container when a form has more than one (e.g. Competition then
 * target).
 */
async function openSingleCombobox(
  page: Page,
  containerSelector: string,
  index = 0,
) {
  await evaluate(
    page,
    `(() => {
      const container = document.querySelector(${JSON.stringify(containerSelector)});
      const inputs = [...(container?.querySelectorAll('input[role="combobox"]') ?? [])];
      inputs[${index}]?.focus();
    })()`,
  );
  await sleep(200);
  await page.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    windowsVirtualKeyCode: 40,
    key: "ArrowDown",
  });
  await page.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    windowsVirtualKeyCode: 40,
    key: "ArrowDown",
  });
  await sleep(400);
}

/**
 * Clicks a shadcn Select's trigger to open its list. `index` picks which
 * `[data-slot="select-trigger"]` inside the container when a form has more
 * than one (e.g. Day then Category on the Schedule Item form).
 */
async function openSelect(page: Page, containerSelector: string, index = 0) {
  await evaluate(
    page,
    `(() => {
      const container = document.querySelector(${JSON.stringify(containerSelector)});
      const triggers = [...(container?.querySelectorAll('[data-slot="select-trigger"]') ?? [])];
      triggers[${index}]?.click();
    })()`,
  );
  await sleep(400);
}

/**
 * Opens a TimeCombobox by its form field `name` (its ComboboxInput has no
 * id/aria-label of its own; it shares a wrapper div with the
 * `FormValueInput` that carries `name`).
 */
async function openTimeComboboxByName(page: Page, name: string) {
  await evaluate(
    page,
    `(() => {
      const hidden = document.querySelector('input[name=${JSON.stringify(name)}]');
      const container = hidden?.parentElement;
      const input = container?.querySelector('input[role="combobox"]');
      input?.focus();
    })()`,
  );
  await sleep(200);
  await page.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    windowsVirtualKeyCode: 40,
    key: "ArrowDown",
  });
  await page.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    windowsVirtualKeyCode: 40,
    key: "ArrowDown",
  });
  await sleep(400);
}

/**
 * Taps a day on the (only) open react-day-picker calendar by its ISO date,
 * matching `CalendarDayButton`'s `data-day` (the button's own date formatted
 * with the page's locale, same as the Date object built here).
 */
async function clickCalendarDay(page: Page, isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  await evaluate(
    page,
    `(() => {
      const label = new Date(${y}, ${m - 1}, ${d}).toLocaleDateString();
      const button = document.querySelector(\`button[data-day="\${label}"]\`);
      button?.click();
    })()`,
  );
  await sleep(300);
}

/**
 * Clicks the shadcn `Switch` inside `containerSelector` (or the document
 * when omitted). It renders `<span role="switch">` beside a hidden
 * checkbox, not a `<button>`, so it can't be found with a `button[...]`
 * selector.
 */
async function clickSwitch(page: Page, containerSelector?: string) {
  await evaluate(
    page,
    `(() => {
      const scope = ${containerSelector ? `document.querySelector(${JSON.stringify(containerSelector)})` : "document"};
      scope?.querySelector('[role="switch"]')?.click();
    })()`,
  );
  await sleep(300);
}

async function clickSelectItem(page: Page, labelSubstring: string) {
  await evaluate(
    page,
    `(() => {
      const items = [...document.querySelectorAll('[data-slot="select-item"]')];
      const item = items.find((el) => el.textContent.includes(${JSON.stringify(labelSubstring)}));
      item?.click();
    })()`,
  );
  await sleep(300);
}

/** Clicks a multi-select combobox's chips input to open its list. */
async function openChipsCombobox(page: Page, containerSelector: string) {
  await evaluate(
    page,
    `(() => {
      const container = document.querySelector(${JSON.stringify(containerSelector)});
      const input = container?.querySelector('[data-slot="combobox-chip-input"]');
      input?.click();
      input?.focus();
    })()`,
  );
  await sleep(300);
  const open = await evaluate<boolean>(
    page,
    `!!document.querySelector('[data-slot="combobox-content"]')`,
  );
  if (!open) {
    await page.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 40,
      key: "ArrowDown",
    });
    await page.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      windowsVirtualKeyCode: 40,
      key: "ArrowDown",
    });
    await sleep(400);
  }
}

async function clickComboboxItem(page: Page, labelSubstring: string) {
  await evaluate(
    page,
    `(() => {
      const items = [...document.querySelectorAll('[data-slot="combobox-item"]')];
      const item = items.find((el) => el.textContent.includes(${JSON.stringify(labelSubstring)}));
      item?.click();
    })()`,
  );
  await sleep(300);
}

/** IX's XI-mapped Appearance Theme columns, saved/restored around a shot. */
type Theme = {
  primary_color: string;
  primary_foreground_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  font_preset: string;
};

async function getTheme(edition: string): Promise<Theme> {
  const [row] = await query<Theme>(
    `select primary_color, primary_foreground_color, accent_color,
            background_color, foreground_color, font_preset
     from war_week where edition = $1`,
    [edition],
  );
  return row;
}

async function setTheme(edition: string, theme: Theme) {
  await query(
    `update war_week set primary_color = $1, primary_foreground_color = $2,
            accent_color = $3, background_color = $4, foreground_color = $5,
            font_preset = $6
     where edition = $7`,
    [
      theme.primary_color,
      theme.primary_foreground_color,
      theme.accent_color,
      theme.background_color,
      theme.foreground_color,
      theme.font_preset,
      edition,
    ],
  );
}

async function overflow(page: Page): Promise<number> {
  return evaluate<number>(
    page,
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
}

async function main() {
  rmSync(FORMS_OUT, { recursive: true, force: true });
  rmSync(PAGES_OUT, { recursive: true, force: true });
  rmSync(OVERFLOW_OUT, { recursive: true, force: true });
  mkdirSync(FORMS_OUT, { recursive: true });
  mkdirSync(PAGES_OUT, { recursive: true });
  mkdirSync(OVERFLOW_OUT, { recursive: true });

  await setOrganizer(true);
  const cookie = await createSession();
  const xiTheme = await getTheme("xi");
  const ixTheme = await getTheme("ix");
  const [xiRange] = await query<{ start_date: string; end_date: string }>(
    `select start_date::text, end_date::text from war_week where edition = 'xi'`,
  );

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
  const dir = mkdtempSync(path.join(os.tmpdir(), "custom-inputs-evidence-"));
  let chrome: ChildProcess | undefined;
  let addedDayDate: string | null = null;

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
        "--remote-debugging-port=9331",
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
          await fetch("http://127.0.0.1:9331/json/list")
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

    // --- Screenshots: admin forms, XI then IX colors, at two widths ------
    type Shot = {
      n: string;
      target: string;
      state: string;
      before?: (p: Page) => Promise<void>;
    };
    const adminShots: Shot[] = [
      {
        n: "01-points-entry",
        target: "/admin/points",
        state: "competition-open",
        before: async (p) => {
          await openSingleCombobox(p, 'form[aria-label="Points Entry"]', 0);
        },
      },
      {
        n: "02-points-entry",
        target: "/admin/points",
        state: "target-open",
        before: async (p) => {
          await openSingleCombobox(p, 'form[aria-label="Points Entry"]', 0);
          await clickComboboxItem(p, "HQ Attendance");
          await openSingleCombobox(p, 'form[aria-label="Points Entry"]', 1);
        },
      },
      {
        n: "03-award-team",
        target: "/admin/awards/new",
        state: "team-open",
        before: async (p) => {
          await openSelect(p, 'form[aria-label="Award"]');
        },
      },
      {
        n: "04-award-participants",
        target: "/admin/awards/new",
        state: "two-chosen",
        before: async (p) => {
          await openChipsCombobox(p, 'form[aria-label="Award"]');
          await clickComboboxItem(p, "Ashley Schuliger");
          await openChipsCombobox(p, 'form[aria-label="Award"]');
          await clickComboboxItem(p, "Sam Schantz");
          await openChipsCombobox(p, 'form[aria-label="Award"]');
        },
      },
      {
        n: "05-days-add",
        target: "/admin/setup/days",
        state: "date-open",
        before: async (p) => {
          await evaluate(
            p,
            `(() => {
              const forms = [...document.querySelectorAll('form')];
              const addForm = forms[forms.length - 1];
              const btn = addForm?.querySelector('button[aria-label="Date"], button');
              btn?.click();
            })()`,
          );
          await sleep(400);
        },
      },
      {
        n: "06-announcement-pinned",
        target: "/admin/announcements/new",
        state: "pinned-on",
        before: async (p) => {
          await clickSwitch(p);
        },
      },
      {
        n: "07-war-week-dates",
        target: "/admin/setup/war-week",
        state: "dates-open",
        before: async (p) => {
          await evaluate(p, `document.getElementById('warWeekDates')?.click()`);
          await sleep(400);
        },
      },
      {
        n: "08-war-week-color",
        target: "/admin/setup/war-week",
        state: "color-open",
        before: async (p) => {
          await evaluate(p, `document.getElementById('primaryColor')?.click()`);
          await sleep(400);
        },
      },
      {
        n: "09-war-week-mode",
        target: "/admin/setup/war-week",
        state: "mode-open",
        before: async (p) => {
          // Status is the first select-trigger in the form, Mode the second.
          await openSelect(p, 'form[aria-label="War Week settings"]', 1);
        },
      },
      {
        n: "10-schedule-start-time",
        target: "/admin/setup/schedule/new",
        state: "start-open",
        before: async (p) => {
          await openTimeComboboxByName(p, "startTime");
        },
      },
      {
        n: "11-schedule-end-time",
        target: "/admin/setup/schedule/new",
        state: "end-open",
        before: async (p) => {
          await openTimeComboboxByName(p, "startTime");
          await clickComboboxItem(p, "8:00 AM");
          await openTimeComboboxByName(p, "endTime");
          // Filters to the options just after the 8:00 AM start, whose
          // labels carry a duration ("8:1... · ...m"), so one is visible.
          await p.send("Input.insertText", { text: "8:1" });
          await sleep(300);
        },
      },
      {
        n: "12-schedule-category",
        target: "/admin/setup/schedule/new",
        state: "category-open",
        before: async (p) => {
          // Day is the first select-trigger in the form, Category the second.
          await openSelect(p, 'form[aria-label="Schedule Item"]', 1);
        },
      },
      {
        n: "13-competitions-scoring",
        target: "/admin/setup/competitions",
        state: "scoring-open",
        before: async (p) => {
          await openSelect(p, 'form[aria-label="New Competition"]', 0);
        },
      },
      {
        n: "14-teams-color",
        target: "/admin/setup/teams",
        state: "color-open",
        before: async (p) => {
          await evaluate(
            p,
            `document.querySelector('form[aria-label="Team Red"] [data-slot="popover-trigger"]')?.click()`,
          );
          await sleep(400);
        },
      },
      {
        n: "15-teams-participant-team",
        target: "/admin/setup/teams",
        state: "team-select-open",
        before: async (p) => {
          await openSelect(p, 'form[aria-label="Ashley Schuliger"]', 0);
        },
      },
    ];

    for (const theme of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (theme.label === "ix") await setTheme("xi", theme.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);
        for (const shot of adminShots) {
          await visit(page, shot.target);
          await shot.before?.(page);
          await shoot(
            page,
            FORMS_OUT,
            `${shot.n}-${shot.state}-${theme.label}-${width}.png`,
          );
        }
      }
      if (theme.label === "ix") await setTheme("xi", xiTheme);
    }

    // --- Screenshots: participant pages, XI and IX, at two widths -------
    const participantShots: Shot[] = [
      {
        n: "01-teams-picker",
        target: "/xi/teams",
        state: "typing",
        before: async (p) => {
          await evaluate(p, `document.querySelector('input[id]')?.focus()`);
          await page.send("Input.insertText", { text: "a" });
          await sleep(400);
        },
      },
      {
        n: "02-teams-picked",
        target: "/xi/teams",
        state: "picked",
        before: async (p) => {
          await evaluate(
            p,
            `(() => {
              const input = [...document.querySelectorAll('input')].find((el) => el.placeholder === 'Start typing your name');
              input?.focus();
            })()`,
          );
          await page.send("Input.insertText", { text: "Ashley" });
          await sleep(400);
          await clickComboboxItem(p, "Ashley Schuliger");
        },
      },
      { n: "03-leaderboard", target: "/xi/leaderboard", state: "plain" },
      { n: "04-more", target: "/xi/more", state: "plain" },
    ];

    for (const width of [375, 1280]) {
      await size(page, width, width === 375 ? 812 : 900);
      for (const shot of participantShots) {
        await visit(page, shot.target);
        await shot.before?.(page);
        await shoot(page, PAGES_OUT, `${shot.n}-${shot.state}-xi-${width}.png`);
      }
      // IX participant pages use its own colors directly; no DB swap needed.
      for (const shot of participantShots) {
        const ixTarget = shot.target.replace(/^\/xi\//, "/ix/");
        await visit(page, ixTarget);
        await shot.before?.(page);
        await shoot(page, PAGES_OUT, `${shot.n}-${shot.state}-ix-${width}.png`);
      }
    }

    // --- Save round-trips (against XI colors, restored above) -----------
    await size(page, 1280, 900);

    // Points Entry.
    await visit(page, "/admin/points");
    await openSingleCombobox(page, 'form[aria-label="Points Entry"]', 0);
    await clickComboboxItem(page, "Settlers of Catan");
    await openSingleCombobox(page, 'form[aria-label="Points Entry"]', 1);
    await clickComboboxItem(page, "Ashley Schuliger");
    await evaluate(
      page,
      `(() => {
        const input = document.querySelector('form[aria-label="Points Entry"] input[name="points"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, '3');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await evaluate(
      page,
      `(() => {
        const input = document.querySelector('form[aria-label="Points Entry"] input[name="note"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(NOTE)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Points Entry"]').requestSubmit()`,
    );
    await sleep(1_500);
    const pointsRows = await query<{
      competition_id: string;
      participant_id: string | null;
      points: string;
    }>(
      `select competition_id, participant_id, points::text from points_entry where note = $1`,
      [NOTE],
    );
    const [competitionRow] = await query<{ id: string }>(
      `select c.id from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi' and c.name = 'Settlers of Catan'`,
    );
    const [participantRow] = await query<{ id: string }>(
      `select p.id from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi' and p.display_name = 'Ashley Schuliger'`,
    );
    check(
      "Points Entry: row saved with the chosen Competition, target, points and note",
      pointsRows.length === 1 &&
        pointsRows[0].competition_id === competitionRow?.id &&
        pointsRows[0].participant_id === participantRow?.id &&
        Number(pointsRows[0].points) === 3,
      JSON.stringify(pointsRows),
    );

    // Award.
    await visit(page, "/admin/awards/new");
    await evaluate(
      page,
      `(() => {
        const input = document.querySelector('form[aria-label="Award"] input[name="name"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(NOTE)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await openSelect(page, 'form[aria-label="Award"]');
    await clickSelectItem(page, "Red");
    await openChipsCombobox(page, 'form[aria-label="Award"]');
    await clickComboboxItem(page, "Ashley Schuliger");
    await openChipsCombobox(page, 'form[aria-label="Award"]');
    await clickComboboxItem(page, "Sam Schantz");
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Award"]').requestSubmit()`,
    );
    await sleep(1_500);
    const [awardRow] = await query<{ id: string; team_id: string | null }>(
      `select a.id, a.team_id from award a join war_week w on w.id = a.war_week_id where w.edition = 'xi' and a.name = $1`,
      [NOTE],
    );
    const [redTeam] = await query<{ id: string }>(
      `select t.id from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi' and t.name = 'Red'`,
    );
    const [ashley] = await query<{ id: string }>(
      `select p.id from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi' and p.display_name = 'Ashley Schuliger'`,
    );
    const [sam] = await query<{ id: string }>(
      `select p.id from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi' and p.display_name = 'Sam Schantz'`,
    );
    const awardParticipants = awardRow
      ? await query<{ participant_id: string }>(
          `select participant_id from award_participant where award_id = $1`,
          [awardRow.id],
        )
      : [];
    check(
      "Award: row saved with the chosen Team and both Participant recipients",
      !!awardRow &&
        awardRow.team_id === redTeam?.id &&
        awardParticipants.length === 2 &&
        awardParticipants.some((r) => r.participant_id === ashley?.id) &&
        awardParticipants.some((r) => r.participant_id === sam?.id),
      JSON.stringify({ awardRow, awardParticipants }),
    );

    // Range refusal: tapping a start after XI's first Day (2026-02-22) shows
    // the Day-outside-range error and leaves the War Week's dates untouched.
    await visit(page, "/admin/setup/war-week");
    await evaluate(page, `document.getElementById('warWeekDates')?.click()`);
    await sleep(400);
    await clickCalendarDay(page, "2026-02-23");
    await clickCalendarDay(page, xiRange?.end_date ?? "2026-02-27");
    await sleep(300);
    const rangeError = await evaluate<string | null>(
      page,
      `document.querySelector('[role="alert"]')?.textContent ?? null`,
    );
    const [xiAfterRefusal] = await query<{
      start_date: string;
      end_date: string;
    }>(
      `select start_date::text, end_date::text from war_week where edition = 'xi'`,
    );
    check(
      "Range refusal: popover shows the Day-outside-range error and the War Week's dates are unchanged",
      rangeError ===
        "The Day on 2026-02-22 falls outside the new dates. Move or delete it first." &&
        xiAfterRefusal?.start_date === xiRange?.start_date &&
        xiAfterRefusal?.end_date === xiRange?.end_date,
      JSON.stringify({ rangeError, xiAfterRefusal, xiRange }),
    );
    await page.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      windowsVirtualKeyCode: 27,
      key: "Escape",
    });
    await sleep(300);

    // Day: extend XI's range by one day so the date picker has a free date
    // to offer, restored in the finally block along with the added Day.
    const extendedEnd = "2026-02-28";
    await query(`update war_week set end_date = $1 where edition = 'xi'`, [
      extendedEnd,
    ]);
    await visit(page, "/admin/setup/days");
    await evaluate(
      page,
      `(() => {
        const forms = [...document.querySelectorAll('form')];
        const addForm = forms[forms.length - 1];
        const btn = addForm?.querySelector('button');
        btn?.click();
      })()`,
    );
    await sleep(400);
    await evaluate(
      page,
      `(() => {
        const cells = [...document.querySelectorAll('[data-slot="calendar"] button, td button, button')];
        const target = cells.find((b) => b.textContent.trim() === '28' && !b.disabled);
        target?.click();
      })()`,
    );
    await sleep(300);
    await evaluate(
      page,
      `(() => {
        const forms = [...document.querySelectorAll('form')];
        const addForm = forms[forms.length - 1];
        const input = addForm?.querySelector('input[name="dayTheme"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(NOTE)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await evaluate(
      page,
      `(() => {
        const forms = [...document.querySelectorAll('form')];
        forms[forms.length - 1]?.requestSubmit();
      })()`,
    );
    await sleep(1_500);
    const dayRows = await query<{ date: string; day_theme: string }>(
      `select date::text, day_theme from day d join war_week w on w.id = d.war_week_id where w.edition = 'xi' and day_theme = $1`,
      [NOTE],
    );
    addedDayDate = dayRows[0]?.date ?? null;
    check(
      `Day: row saved with date ${extendedEnd} and theme "${NOTE}"`,
      dayRows.length === 1 && dayRows[0].date === extendedEnd,
      JSON.stringify(dayRows),
    );

    // Schedule Item: create via the converted form (Day/Category selects,
    // start typed as "7:30p", end chosen from the list, Competition combobox
    // left at "No Competition").
    await visit(page, "/admin/setup/schedule/new");
    await openSelect(page, 'form[aria-label="Schedule Item"]', 0);
    await clickSelectItem(page, "Red vs. Blue");
    await openTimeComboboxByName(page, "startTime");
    await page.send("Input.insertText", { text: "7:30p" });
    await openTimeComboboxByName(page, "endTime");
    await clickComboboxItem(page, "8:00 PM");
    await openSelect(page, 'form[aria-label="Schedule Item"]', 1);
    await clickSelectItem(page, "Other");
    await evaluate(
      page,
      `(() => {
        const input = document.querySelector('form[aria-label="Schedule Item"] input[name="title"]');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(NOTE)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`,
    );
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Schedule Item"]').requestSubmit()`,
    );
    await sleep(1_500);
    const scheduleRows = await query<{
      date: string;
      start_time: string;
      end_time: string | null;
      category: string;
    }>(
      `select d.date::text, si.start_time::text, si.end_time::text, si.category
       from schedule_item si
       join day d on d.id = si.day_id
       join war_week w on w.id = d.war_week_id
       where w.edition = 'xi' and si.title = $1`,
      [NOTE],
    );
    check(
      'Schedule Item: row saved with the chosen Day, start "7:30p" as 19:30, the chosen end, and category other',
      scheduleRows.length === 1 &&
        scheduleRows[0].date === "2026-02-24" &&
        scheduleRows[0].start_time.startsWith("19:30") &&
        (scheduleRows[0].end_time?.startsWith("20:00") ?? false) &&
        scheduleRows[0].category === "other",
      JSON.stringify(scheduleRows),
    );

    // Team color: change Team Red's color via a ColorField swatch (Blue's),
    // save, then restore the original color directly.
    const [redTeamBefore] = await query<{ id: string; color: string }>(
      `select t.id, t.color from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi' and t.name = 'Red'`,
    );
    await visit(page, "/admin/setup/teams");
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Team Red"] [data-slot="popover-trigger"]')?.click()`,
    );
    await sleep(400);
    await evaluate(
      page,
      `document.querySelector('[data-slot="popover-content"] button[aria-label="Blue"]')?.click()`,
    );
    await sleep(300);
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Team Red"]').requestSubmit()`,
    );
    await sleep(1_500);
    const [redTeamAfter] = await query<{ color: string }>(
      `select color from team where id = $1`,
      [redTeamBefore.id],
    );
    const [blueTeam] = await query<{ color: string }>(
      `select t.color from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi' and t.name = 'Blue'`,
    );
    check(
      "Team color: Red's ColorField save wrote Blue's swatch color to the DB",
      redTeamAfter?.color?.toLowerCase() === blueTeam?.color?.toLowerCase(),
      JSON.stringify({ redTeamAfter, blueTeam }),
    );
    await query(`update team set color = $1 where id = $2`, [
      redTeamBefore.color,
      redTeamBefore.id,
    ]);

    // Leader switch: toggle Leader on Ashley Schuliger, save, then restore.
    const [ashleyBefore] = await query<{ id: string; is_leader: boolean }>(
      `select p.id, p.is_leader from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi' and p.display_name = 'Ashley Schuliger'`,
    );
    await visit(page, "/admin/setup/teams");
    await clickSwitch(page, 'form[aria-label="Ashley Schuliger"]');
    await evaluate(
      page,
      `document.querySelector('form[aria-label="Ashley Schuliger"]').requestSubmit()`,
    );
    await sleep(1_500);
    const [ashleyAfter] = await query<{ is_leader: boolean }>(
      `select is_leader from participant where id = $1`,
      [ashleyBefore.id],
    );
    check(
      "Leader switch: toggling and saving flipped Ashley Schuliger's is_leader",
      ashleyAfter?.is_leader === !ashleyBefore.is_leader,
      JSON.stringify({ ashleyBefore, ashleyAfter }),
    );
    await query(`update participant set is_leader = $1 where id = $2`, [
      ashleyBefore.is_leader,
      ashleyBefore.id,
    ]);

    // You picker: pick, assert localStorage; clear, assert removed. Clears
    // any pick left over from the screenshot pass first.
    await visit(page, "/xi/teams");
    await evaluate(page, `localStorage.removeItem('ww:you:xi')`);
    await visit(page, "/xi/teams");
    await evaluate(
      page,
      `(() => {
        const input = [...document.querySelectorAll('input')].find((el) => el.placeholder === 'Start typing your name');
        input?.focus();
      })()`,
    );
    await page.send("Input.insertText", { text: "Jory" });
    await sleep(400);
    await clickComboboxItem(page, "Jory Hutchins");
    await sleep(400);
    const [joryParticipant] = await query<{ id: string }>(
      `select p.id from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi' and p.display_name = 'Jory Hutchins'`,
    );
    const storedId = await evaluate<string | null>(
      page,
      `localStorage.getItem('ww:you:xi')`,
    );
    check(
      "You picker: picking a Participant stores their id under ww:you:xi",
      storedId === joryParticipant?.id,
      `stored=${storedId} expected=${joryParticipant?.id}`,
    );
    await evaluate(
      page,
      `[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Not me'))?.click()`,
    );
    await sleep(400);
    const clearedId = await evaluate<string | null>(
      page,
      `localStorage.getItem('ww:you:xi')`,
    );
    check(
      "You picker: 'Not me / clear' removes the stored pick",
      clearedId === null,
      `stored=${clearedId}`,
    );

    writeFileSync(
      path.join(FORMS_OUT, "round-trips.txt"),
      roundTripLines.join("\n") + "\n",
    );

    // --- Overflow sweep ---------------------------------------------------
    const routes = [
      "/admin",
      "/admin/points",
      "/admin/standings",
      "/admin/announcements",
      "/admin/announcements/new",
      "/admin/awards",
      "/admin/awards/new",
      "/admin/setup",
      "/admin/setup/war-week",
      "/admin/setup/days",
      "/admin/setup/teams",
      "/admin/setup/competitions",
      "/admin/setup/schedule",
      "/admin/setup/schedule/new",
      "/admin/setup/faq",
      "/xi",
      "/xi/leaderboard",
      "/xi/schedule",
      "/xi/teams",
      "/xi/competitions",
      "/xi/news",
      "/xi/awards",
      "/xi/faq",
      "/xi/more",
      "/ix",
      "/ix/teams",
      "/ix/leaderboard",
      "/history",
      "/about",
    ];
    const widths = [375, 768, 812, 1024, 1280];
    const overflowLines: string[] = [
      "route\twidth\toverflow_px",
      "-----\t-----\t-----------",
    ];
    for (const route of routes) {
      for (const width of widths) {
        await size(page, width, 900);
        await visit(page, route);
        const px = await overflow(page);
        overflowLines.push(`${route}\t${width}\t${px}`);
        console.log(
          `${px === 0 ? "ok" : "FAIL"} ${route} @${width}: overflow ${px}px`,
        );
        if (px !== 0) failures += 1;
      }
    }
    // Extra: combobox popup open at 375, admin points and the Teams picker.
    await size(page, 375, 812);
    await visit(page, "/admin/points");
    await openSingleCombobox(page, 'form[aria-label="Points Entry"]');
    let px = await overflow(page);
    overflowLines.push(`/admin/points (combobox open)\t375\t${px}`);
    console.log(
      `${px === 0 ? "ok" : "FAIL"} /admin/points (combobox open) @375: overflow ${px}px`,
    );
    if (px !== 0) failures += 1;

    await visit(page, "/xi/teams");
    await evaluate(page, `document.querySelector('input[id]')?.focus()`);
    await page.send("Input.insertText", { text: "a" });
    await sleep(400);
    px = await overflow(page);
    overflowLines.push(`/xi/teams (combobox open)\t375\t${px}`);
    console.log(
      `${px === 0 ? "ok" : "FAIL"} /xi/teams (combobox open) @375: overflow ${px}px`,
    );
    if (px !== 0) failures += 1;

    await visit(page, "/admin/setup/war-week");
    await evaluate(page, `document.getElementById('warWeekDates')?.click()`);
    await sleep(400);
    px = await overflow(page);
    overflowLines.push(
      `/admin/setup/war-week (dates popover open)\t375\t${px}`,
    );
    console.log(
      `${px === 0 ? "ok" : "FAIL"} /admin/setup/war-week (dates popover open) @375: overflow ${px}px`,
    );
    if (px !== 0) failures += 1;

    await visit(page, "/admin/setup/schedule/new");
    await openTimeComboboxByName(page, "startTime");
    px = await overflow(page);
    overflowLines.push(
      `/admin/setup/schedule/new (time combobox open)\t375\t${px}`,
    );
    console.log(
      `${px === 0 ? "ok" : "FAIL"} /admin/setup/schedule/new (time combobox open) @375: overflow ${px}px`,
    );
    if (px !== 0) failures += 1;

    writeFileSync(
      path.join(OVERFLOW_OUT, "overflow.txt"),
      overflowLines.join("\n") + "\n",
    );

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    await query(`delete from points_entry where note = $1`, [NOTE]);
    await query(
      `delete from award where name = $1 and war_week_id = (select id from war_week where edition = 'xi')`,
      [NOTE],
    );
    await query(
      `delete from schedule_item where title = $1 and day_id in (select d.id from day d join war_week w on w.id = d.war_week_id where w.edition = 'xi')`,
      [NOTE],
    );
    if (addedDayDate) {
      await query(
        `delete from day where day_theme = $1 and war_week_id = (select id from war_week where edition = 'xi')`,
        [NOTE],
      );
    }
    await query(`update war_week set end_date = $1 where edition = 'xi'`, [
      xiRange?.end_date,
    ]);
    await setTheme("xi", xiTheme);
    await query(`delete from "user" where email = $1`, [EMAIL]);
    await setOrganizer(false);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
