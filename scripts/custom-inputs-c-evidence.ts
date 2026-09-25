/**
 * Evidence for the custom-inputs Phase C deliverable (shadcn participant-page
 * building blocks: Card/Badge/Avatar/Tabs, the More menu as a Sheet on
 * phones, and Skeleton loading states). Captures the listed participant
 * surfaces in XI (live, as seeded) and in IX's dark colors (background
 * #120d1f), at 375x812 and 1280x900; the More Sheet open at 375; the
 * `loading.tsx` inventory; a handful of markup/behavior checks; and sweeps
 * every admin and participant route (plus the More Sheet open) for
 * horizontal overflow at 375/768/812/1024/1280.
 *
 * Needs a production build, Google Chrome, and its OWN private Postgres —
 * never the shared `war_weeker` DB, which a parallel `pnpm smoke` elsewhere
 * can wipe mid-run. Before running:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database if exists war_weeker_ci_c"
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "create database war_weeker_ci_c"
 *   export DATABASE_URL="postgres://postgres:postgres@localhost:2345/war_weeker_ci_c?sslmode=disable"
 *   export DATABASE_DRIVER=pg
 *   pnpm db:migrate && pnpm seed:all
 *   pnpm build
 *   pnpm tsx scripts/custom-inputs-c-evidence.ts
 *
 * Starts its own server on port 3234. Screenshots and checks.txt land under
 * test-results/custom-inputs-c-pages/; the overflow table lands under
 * test-results/custom-inputs-c-overflow/. Rerunning replaces both
 * directories. Drop the private DB and confirm nothing is left on port 3234
 * afterwards:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database war_weeker_ci_c"
 *   lsof -ti tcp:3234 -sTCP:LISTEN
 */
import { loadEnvConfig } from "@next/env";
import { makeSignature } from "better-auth/crypto";
import { type ChildProcess, spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const PORT = 3234;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PAGES_OUT = path.resolve(
  process.cwd(),
  "test-results/custom-inputs-c-pages",
);
const OVERFLOW_OUT = path.resolve(
  process.cwd(),
  "test-results/custom-inputs-c-overflow",
);
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-inputs-c-organizer@jahnelgroup.com";

const dbUrl = process.env.DATABASE_URL ?? "";
if (/\/war_weeker(\?.*)?$/.test(dbUrl)) {
  console.error(
    `Refusing to run: DATABASE_URL points at the shared war_weeker DB (${dbUrl}). ` +
      "Use a private DB, e.g. war_weeker_ci_c.",
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
const checkLines: string[] = [];
function check(label: string, pass: boolean, detail?: string) {
  const line = pass
    ? `ok ${label}`
    : `FAIL ${label}${detail ? `: ${detail}` : ""}`;
  console.log(line);
  checkLines.push(line);
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

async function overflow(page: Page): Promise<number> {
  return evaluate<number>(
    page,
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
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

/** Opens the phone bottom tab bar's More Sheet by clicking its trigger. */
async function openMoreSheet(page: Page) {
  await evaluate(
    page,
    `(() => {
      // Two navs share the label: the desktop top nav (hidden on a phone)
      // and the bottom tab bar, which is the last one.
      const nav = [...document.querySelectorAll('nav[aria-label="Primary"]')].at(-1);
      const buttons = [...(nav?.querySelectorAll('button') ?? [])];
      const trigger = buttons.find((b) => b.textContent?.includes('More'));
      trigger?.click();
    })()`,
  );
  await sleep(500);
}

async function main() {
  rmSync(PAGES_OUT, { recursive: true, force: true });
  rmSync(OVERFLOW_OUT, { recursive: true, force: true });
  mkdirSync(PAGES_OUT, { recursive: true });
  mkdirSync(OVERFLOW_OUT, { recursive: true });

  await setOrganizer(true);
  const cookie = await createSession();
  const xiTheme = await getTheme("xi");
  const ixTheme = await getTheme("ix");
  const [competition] = await query<{ id: string }>(
    `select c.id from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi' order by c.name limit 1`,
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "custom-inputs-c-evidence-"));
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
    await page.send("Runtime.enable");
    await setCookie(page, cookie);

    // --- Screenshots: participant pages, XI colors then IX's dark colors,
    // at 375x812 and 1280x900 --------------------------------------------
    const participantRoutes = [
      { n: "01-home", target: "/xi" },
      { n: "02-leaderboard", target: "/xi/leaderboard" },
      { n: "03-competitions", target: "/xi/competitions" },
      ...(competition
        ? [
            {
              n: "04-competition-detail",
              target: `/xi/competitions/${competition.id}`,
            },
          ]
        : []),
      { n: "05-news", target: "/xi/news" },
      { n: "06-awards", target: "/xi/awards" },
      { n: "07-teams", target: "/xi/teams" },
      { n: "08-history", target: "/history" },
    ];

    for (const colorPass of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (colorPass.label === "ix") await setTheme("xi", colorPass.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);
        for (const route of participantRoutes) {
          await visit(page, route.target);
          await shoot(
            page,
            PAGES_OUT,
            `${route.n}-${colorPass.label}-${width}.png`,
          );
        }
      }
      if (colorPass.label === "ix") await setTheme("xi", xiTheme);
    }

    // --- Screenshot: the More Sheet open at 375 --------------------------
    await size(page, 375, 812);
    await visit(page, "/xi");
    await openMoreSheet(page);
    await shoot(page, PAGES_OUT, "09-more-sheet-xi-375.png");
    const sheetVisible = await evaluate<boolean>(
      page,
      `!!document.querySelector('[role="dialog"]')`,
    );
    const sheetHrefs = await evaluate<string[]>(
      page,
      `[...document.querySelectorAll('[role="dialog"] a')].map((a) => a.getAttribute('href'))`,
    );
    const expectedHrefs = [
      "/xi/competitions",
      "/xi/teams",
      "/xi/awards",
      "/xi/faq",
      "/history",
      "/install",
      "/about",
    ];
    check(
      'More Sheet: [role="dialog"] visible at 375 and links to every expected destination',
      sheetVisible && expectedHrefs.every((href) => sheetHrefs.includes(href)),
      JSON.stringify({ sheetVisible, sheetHrefs }),
    );

    // Tapping a link in the Sheet navigates and closes it.
    await evaluate(
      page,
      `(() => {
        const link = [...document.querySelectorAll('[role="dialog"] a')].find(
          (a) => a.getAttribute('href') === '/xi/competitions',
        );
        link?.click();
      })()`,
    );
    await sleep(1_000);
    const pathAfterTap = await evaluate<string>(page, `location.pathname`);
    const sheetGoneAfterTap = await evaluate<boolean>(
      page,
      `!document.querySelector('[role="dialog"]')`,
    );
    check(
      "More Sheet: tapping a link navigates to /xi/competitions and closes the Sheet",
      pathAfterTap === "/xi/competitions" && sheetGoneAfterTap,
      JSON.stringify({ pathAfterTap, sheetGoneAfterTap }),
    );

    // --- Check: at 1280 the top nav still links to /xi/more --------------
    await size(page, 1280, 900);
    await visit(page, "/xi");
    const topNavMoreHref = await evaluate<string | null>(
      page,
      `(() => {
        const links = [...document.querySelectorAll('header nav[aria-label="Primary"] a')];
        const more = links.find((a) => a.textContent?.includes('More'));
        return more?.getAttribute('href') ?? null;
      })()`,
    );
    check(
      "Top nav at 1280 still links to /xi/more",
      topNavMoreHref === "/xi/more",
      `href=${topNavMoreHref}`,
    );

    // --- Check: /xi/leaderboard HTML still matches the smoke regex -------
    const leaderboardBody = await fetch(`${BASE_URL}/xi/leaderboard`, {
      headers: { cookie: `better-auth.session_token=${cookie}` },
    }).then((r) => r.text());
    const [teamRow] = await query<{ name: string }>(
      `select t.name from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi' order by t.name limit 1`,
    );
    const smokeRegexMatch = teamRow
      ? new RegExp(
          `font-semibold">${teamRow.name}</span><span class="[^"]*">([-\\d.,]+)</span>`,
        ).test(leaderboardBody)
      : false;
    check(
      `/xi/leaderboard HTML still matches the smoke regex for team "${teamRow?.name}"`,
      smokeRegexMatch,
      `teamRow=${JSON.stringify(teamRow)}`,
    );

    // --- Check: data-slot="card" count > 0 on each participant page ------
    for (const route of participantRoutes) {
      await visit(page, route.target);
      const cardCount = await evaluate<number>(
        page,
        `document.querySelectorAll('[data-slot="card"]').length`,
      );
      check(
        `[data-slot="card"] count > 0 on ${route.target}`,
        cardCount > 0,
        `count=${cardCount}`,
      );
    }

    // --- Check: loading.tsx inventory --------------------------------------
    const loadingFiles = execSync("find src/app -name loading.tsx", {
      cwd: process.cwd(),
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
    check(
      `${loadingFiles.length} loading.tsx files found, each importing page-skeleton (live skeleton capture skipped: streaming render timing is unreliable to script within scope; this static inventory substitutes)`,
      loadingFiles.length > 0,
      loadingFiles.join(", "),
    );
    for (const file of loadingFiles) {
      const importsPageSkeleton = execSync(
        `grep -l "page-skeleton" ${JSON.stringify(file)}`,
        { cwd: process.cwd(), encoding: "utf8" },
      ).trim();
      check(
        `${file} imports page-skeleton`,
        importsPageSkeleton === file,
        importsPageSkeleton,
      );
    }

    writeFileSync(
      path.join(PAGES_OUT, "checks.txt"),
      checkLines.join("\n") + "\n",
    );

    // --- Overflow sweep -----------------------------------------------------
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
    // Extra: the More Sheet open at 375 and 768.
    for (const width of [375, 768]) {
      await size(page, width, width === 375 ? 812 : 900);
      await visit(page, "/xi");
      await openMoreSheet(page);
      const px = await overflow(page);
      overflowLines.push(`/xi (More Sheet open)\t${width}\t${px}`);
      console.log(
        `${px === 0 ? "ok" : "FAIL"} /xi (More Sheet open) @${width}: overflow ${px}px`,
      );
      if (px !== 0) failures += 1;
    }

    writeFileSync(
      path.join(OVERFLOW_OUT, "overflow.txt"),
      overflowLines.join("\n") + "\n",
    );

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
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
