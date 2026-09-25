/**
 * Evidence for the Brackets + War Week lifecycle deliverable: a 4-Team
 * single-elimination Bracket built and run end to end (Format, Entrants,
 * Generate, Heat Results, champion, Finalize/Un-finalize/re-Finalize round
 * trips), the participant Bracket view (with a "You" highlight), and the
 * War Week lifecycle screens (Setup Lifecycle box, End dialog, Create next
 * War Week, and the admin edition switcher's Archive banner). Captures
 * 375x812 and 1280x900 screenshots in XI's live colors and (via a
 * temporary XI→IX color swap, ported from the custom-inputs Phase B
 * evidence script) one dark past edition's colors, then sweeps for
 * horizontal overflow at 375/768/1280.
 *
 * Needs a production build, Google Chrome, and its OWN private Postgres —
 * never the shared `war_weeker` DB, which a parallel `pnpm smoke` elsewhere
 * can wipe mid-run. Before running:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database if exists war_weeker_ci_k5"
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "create database war_weeker_ci_k5"
 *   export DATABASE_URL="postgres://postgres:postgres@localhost:2345/war_weeker_ci_k5?sslmode=disable"
 *   export DATABASE_DRIVER=pg
 *   pnpm db:migrate && pnpm seed:all
 *   pnpm build
 *   pnpm tsx scripts/brackets-evidence.ts
 *
 * Starts its own server on port 3241. Screenshots land under
 * test-results/brackets-loop/ and test-results/brackets-lifecycle/; the
 * round trips land in test-results/brackets-loop/round-trips.txt; the
 * overflow table lands under test-results/brackets-overflow/. Rerunning
 * replaces all three directories (test-results/brackets-finale/ is a
 * separate deliverable's evidence and is never touched here). Drop the
 * private DB and confirm nothing is left on port 3241 afterwards:
 *
 *   docker exec war-weeker-postgres psql -U postgres -c \
 *     "drop database war_weeker_ci_k5"
 *   lsof -ti tcp:3241 -sTCP:LISTEN
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

const PORT = 3241;
const CDP_PORT = 9341;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LOOP_OUT = path.resolve(process.cwd(), "test-results/brackets-loop");
const LIFECYCLE_OUT = path.resolve(
  process.cwd(),
  "test-results/brackets-lifecycle",
);
const OVERFLOW_OUT = path.resolve(
  process.cwd(),
  "test-results/brackets-overflow",
);
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;
const EMAIL = "evidence-brackets-organizer@jahnelgroup.com";
const NOTE = "SMOKE TEST - delete me";
const COMP_NAME = "Demo Bracket";
const ADMIN_EDITION_COOKIE = "admin_edition";

const dbUrl = process.env.DATABASE_URL ?? "";
if (/\/war_weeker(\?.*)?$/.test(dbUrl)) {
  console.error(
    `Refusing to run: DATABASE_URL points at the shared war_weeker DB (${dbUrl}). ` +
      "Use a private DB, e.g. war_weeker_ci_k5.",
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

async function setCookie(
  page: Page,
  name: string,
  value: string,
  { httpOnly = true } = {},
) {
  await page.send("Network.setCookie", {
    name,
    value,
    url: BASE_URL,
    httpOnly,
  });
}

async function clearCookie(page: Page, name: string) {
  await page.send("Network.deleteCookies", { name, url: BASE_URL });
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

/** Clicks the first button whose text content matches `pattern`. */
async function clickButtonMatching(page: Page, pattern: string) {
  await evaluate(
    page,
    `(() => {
      const re = new RegExp(${JSON.stringify(pattern)});
      const btn = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()));
      btn?.click();
    })()`,
  );
  await sleep(400);
}

/** Opens a themed Select (OptionSelect) by trigger id, then picks an item by its visible text. */
async function chooseSelect(page: Page, triggerId: string, itemText: string) {
  await evaluate(
    page,
    `document.getElementById(${JSON.stringify(triggerId)})?.click()`,
  );
  await sleep(400);
  await evaluate(
    page,
    `(() => {
      const items = [...document.querySelectorAll('[data-slot="select-item"]')];
      const item = items.find((el) => el.textContent.includes(${JSON.stringify(itemText)}));
      item?.click();
    })()`,
  );
  await sleep(500);
}

/** Clicks the confirm action inside the open `[role=alertdialog]`. */
async function clickDialogButton(page: Page, label: string) {
  await evaluate(
    page,
    `(() => {
      const dialog = document.querySelector('[role="alertdialog"]');
      const btn = [...(dialog?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === ${JSON.stringify(label)});
      btn?.click();
    })()`,
  );
  await sleep(700);
}

/** Opens the Heat Result Sheet for the Heat named `ariaLabel` ("Record Semifinal 1", …). */
async function openHeatSheet(page: Page, ariaLabel: string) {
  await evaluate(
    page,
    `document.querySelector('[aria-label=${JSON.stringify(ariaLabel)}]')?.click()`,
  );
  await sleep(600);
}

/** In the open Heat Result Sheet, taps the Entrant labelled `labelSubstring` as winner. */
async function pickWinner(page: Page, labelSubstring: string) {
  await evaluate(
    page,
    `(() => {
      const group = document.querySelector('[role="group"][aria-label="Winner"]');
      const btn = [...(group?.querySelectorAll('button') ?? [])].find((b) => b.textContent.includes(${JSON.stringify(labelSubstring)}));
      btn?.click();
    })()`,
  );
  await sleep(300);
}

async function saveHeatResult(page: Page) {
  await clickButtonMatching(page, "^Save Heat Result$");
  await sleep(900);
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

type HeatRow = {
  heat_id: string;
  round: number;
  position: number;
  slot: number;
  entrant_id: string;
  label: string;
};

async function loadHeats(competitionId: string): Promise<HeatRow[]> {
  return query<HeatRow>(
    `select h.id as heat_id, h.round, h.position, he.slot, e.id as entrant_id,
            coalesce(t.name, p.display_name) as label
     from heat h
     join heat_entrant he on he.heat_id = h.id
     join entrant e on e.id = he.entrant_id
     left join team t on t.id = e.team_id
     left join participant p on p.id = e.participant_id
     where h.competition_id = $1
     order by h.round, h.position, he.slot`,
    [competitionId],
  );
}

async function main() {
  rmSync(LOOP_OUT, { recursive: true, force: true });
  rmSync(LIFECYCLE_OUT, { recursive: true, force: true });
  rmSync(OVERFLOW_OUT, { recursive: true, force: true });
  mkdirSync(LOOP_OUT, { recursive: true });
  mkdirSync(LIFECYCLE_OUT, { recursive: true });
  mkdirSync(OVERFLOW_OUT, { recursive: true });

  await setOrganizer(true);
  const cookie = await createSession();
  const overflowLines: string[] = [
    "route\twidth\toverflow_px",
    "-----\t-----\t-----------",
  ];
  function recordOverflow(label: string, width: number, px: number) {
    overflowLines.push(`${label}\t${width}\t${px}`);
    console.log(
      `${px === 0 ? "ok" : "FAIL"} ${label} @${width}: overflow ${px}px`,
    );
    if (px !== 0) failures += 1;
  }
  const xiTheme = await getTheme("xi");
  const ixTheme = await getTheme("ix");
  const [xiWarWeek] = await query<{
    id: string;
    team_label: string;
    edition_number: number;
    year: number;
  }>(
    `select id, team_label, edition_number, year from war_week where edition = 'xi'`,
  );

  // A team-scoring Demo Bracket with Placement Points 10/6/3, plus two
  // extra Teams so XI has 4 (it seeds only 2).
  const [comp] = await query<{ id: string }>(
    `insert into competition (war_week_id, name, scoring, placement_points, format)
     values ($1, $2, 'team', array[10,6,3], 'points') returning id`,
    [xiWarWeek.id, COMP_NAME],
  );
  const competitionId = comp.id;
  await query(
    `insert into team (war_week_id, name, color) values ($1, 'Gold', '#d4a017'), ($1, 'Green', '#2e7d32')`,
    [xiWarWeek.id],
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
  const dir = mkdtempSync(path.join(os.tmpdir(), "brackets-evidence-"));
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
        `--remote-debugging-port=${CDP_PORT}`,
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
          await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)
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
    await page.send("Network.clearBrowserCookies");
    await setCookie(page, "better-auth.session_token", cookie);

    // --- Build the Bracket through the builder UI ------------------------
    const builderPath = `/admin/setup/competitions/${competitionId}/bracket`;
    const resultsPath = `/admin/brackets/${competitionId}`;
    const participantPath = `/xi/competitions/${competitionId}`;

    await size(page, 1280, 900);
    await visit(page, builderPath);
    await chooseSelect(page, "bracket-format", "Single elimination");
    await visit(page, builderPath); // fresh render after the Format change
    await clickButtonMatching(page, `^All ${xiWarWeek.team_label}s$`);
    await clickButtonMatching(page, "^Save Entrants$");
    await clickButtonMatching(page, "^Generate$");
    await sleep(500);

    // Right after Generate, only the 2 Round-1 (semifinal) Heats have
    // Entrants; the Final's slots fill once its semifinals are decided.
    const afterGenerate = await loadHeats(competitionId);
    check(
      "Generate: single-elimination Bracket drew the 2 semifinal Heats for 4 Entrants",
      new Set(afterGenerate.map((h) => h.heat_id)).size === 2 &&
        afterGenerate.length === 4,
      JSON.stringify(afterGenerate.map((h) => h.heat_id)),
    );

    // A hand-entered Points Entry on the same Competition, inserted before
    // Finalize so the round trips below can prove it's untouched.
    const [firstTeam] = await query<{ id: string }>(
      `select team_id as id from entrant where competition_id = $1 and team_id is not null order by seed_position limit 1`,
      [competitionId],
    );
    const [handEntered] = await query<{ id: string; points: string }>(
      `insert into points_entry (competition_id, team_id, points, note, entered_by_email, generated_by_bracket)
       values ($1, $2, 1, $3, $4, false) returning id, points`,
      [competitionId, firstTeam.id, NOTE, EMAIL],
    );

    // --- Screenshots: builder, in XI then IX colors -----------------------
    for (const theme of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (theme.label === "ix") await setTheme("xi", theme.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);
        await visit(page, builderPath);
        await shoot(page, LOOP_OUT, `01-builder-${theme.label}-${width}.png`);
      }
    }
    await setTheme("xi", xiTheme);

    // --- Record the two semifinals and the Final through the Sheet -------
    await size(page, 375, 812);
    await visit(page, resultsPath);
    await openHeatSheet(page, "Record Semifinal 1");
    await shoot(page, LOOP_OUT, "02-heat-sheet-open-375.png");
    recordOverflow(`${resultsPath} (Sheet open)`, 375, await overflow(page));
    const semi1 = afterGenerate.filter(
      (h) => h.round === 1 && h.position === 1,
    );
    await pickWinner(page, semi1[0].label);
    await saveHeatResult(page);

    await openHeatSheet(page, "Record Semifinal 2");
    const semi2 = afterGenerate.filter(
      (h) => h.round === 1 && h.position === 2,
    );
    await pickWinner(page, semi2[0].label);
    await saveHeatResult(page);

    const beforeFinal = await loadHeats(competitionId);
    const final = beforeFinal.filter((h) => h.round === 2);
    await openHeatSheet(page, "Record Final");
    await pickWinner(page, final[0].label);
    await saveHeatResult(page);

    check(
      "Recording: the Final's two slots are the semifinal winners",
      final.length === 2,
      JSON.stringify(final),
    );

    // --- Screenshots: results with the champion banner, XI then IX -------
    for (const theme of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (theme.label === "ix") await setTheme("xi", theme.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);
        await visit(page, resultsPath);
        await shoot(page, LOOP_OUT, `03-results-${theme.label}-${width}.png`);
      }
    }
    await setTheme("xi", xiTheme);

    // --- Finalize ----------------------------------------------------------
    await size(page, 1280, 900);
    await visit(page, resultsPath);
    await clickButtonMatching(page, "^Finalize$");
    await sleep(400);
    await clickDialogButton(page, "Finalize");

    // --- Round trips ---------------------------------------------------
    const placingSql = `
      select e.team_id as team_id, coalesce(t.name, p.display_name) as label, pe.points::text as points
      from points_entry pe
      join entrant e on e.team_id = pe.team_id and e.competition_id = pe.competition_id
      left join team t on t.id = e.team_id
      left join participant p on p.id = e.participant_id
      where pe.competition_id = $1 and pe.generated_by_bracket = true
      order by pe.points desc, label
    `;
    const generated1 = await query<{
      team_id: string;
      label: string;
      points: string;
    }>(placingSql, [competitionId]);
    check(
      "Finalize: 4 generated Points Entries (10/6/3/3) from the final placings",
      generated1.length === 4 &&
        generated1
          .map((r) => Number(r.points))
          .sort((a, b) => a - b)
          .join(",") === "3,3,6,10",
      JSON.stringify(generated1),
    );

    const [totals] = await query<{ total: string }>(
      `select sum(points)::text as total from points_entry where competition_id = $1 and generated_by_bracket = true`,
      [competitionId],
    );
    check(
      "Finalize: Standings totals for this Competition rose by exactly the generated points (10+6+3+3=22)",
      Number(totals.total) === 22,
      totals.total,
    );

    const [handAfterFinalize] = await query<{ points: string }>(
      `select points::text as points from points_entry where id = $1`,
      [handEntered.id],
    );
    check(
      "Finalize: the hand-entered Points Entry on the same Competition is untouched",
      handAfterFinalize?.points === handEntered.points,
      JSON.stringify(handAfterFinalize),
    );

    // Un-finalize
    await visit(page, resultsPath);
    await clickButtonMatching(page, "^Un-finalize$");
    await sleep(400);
    await clickDialogButton(page, "Un-finalize");
    await sleep(500);
    const [generatedAfterUnfinalize] = await query<{ count: string }>(
      `select count(*)::text as count from points_entry where competition_id = $1 and generated_by_bracket = true`,
      [competitionId],
    );
    check(
      "Un-finalize: removes the generated Points Entries",
      generatedAfterUnfinalize.count === "0",
      generatedAfterUnfinalize.count,
    );
    const [handAfterUnfinalize] = await query<{ id: string }>(
      `select id from points_entry where id = $1`,
      [handEntered.id],
    );
    check(
      "Un-finalize: the hand-entered Points Entry is still untouched",
      !!handAfterUnfinalize,
      JSON.stringify(handAfterUnfinalize),
    );

    // Re-finalize
    await visit(page, resultsPath);
    await clickButtonMatching(page, "^Finalize$");
    await sleep(400);
    await clickDialogButton(page, "Finalize");
    await sleep(500);
    const generated2 = await query<{
      team_id: string;
      label: string;
      points: string;
    }>(placingSql, [competitionId]);
    check(
      "Re-finalize: produces the same set of targets and points as the first Finalize",
      JSON.stringify(generated1.map((r) => [r.team_id, r.points])) ===
        JSON.stringify(generated2.map((r) => [r.team_id, r.points])),
      JSON.stringify({ first: generated1, second: generated2 }),
    );

    // /admin/points shows the "From bracket" badge and no Edit/Delete on
    // those rows.
    await visit(page, "/admin/points");
    const pointsPageCheck = await evaluate<{
      badgeCount: number;
      anyHasEditOrDelete: boolean;
    }>(
      page,
      `(() => {
        const badges = [...document.querySelectorAll('span')].filter((el) => el.textContent.trim() === 'From bracket');
        const anyHasEditOrDelete = badges.some((badge) => {
          const row = badge.closest('tr');
          if (!row) return true;
          const text = row.textContent ?? '';
          return /\\bEdit\\b/.test(text) || /\\bDelete\\b/.test(text);
        });
        return { badgeCount: badges.length, anyHasEditOrDelete };
      })()`,
    );
    check(
      '/admin/points: shows a "From bracket" badge on each generated row, with no Edit/Delete',
      pointsPageCheck.badgeCount === 4 && !pointsPageCheck.anyHasEditOrDelete,
      JSON.stringify(pointsPageCheck),
    );

    writeFileSync(
      path.join(LOOP_OUT, "round-trips.txt"),
      roundTripLines.join("\n") + "\n",
    );

    // --- Participant view, XI then IX, with a You highlight ---------------
    const [youParticipant] = await query<{ id: string }>(
      `select p.id from participant p
       join entrant e on e.team_id = p.team_id and e.competition_id = $1
       where p.war_week_id = $2
       limit 1`,
      [competitionId, xiWarWeek.id],
    );

    for (const theme of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (theme.label === "ix") await setTheme("xi", theme.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);
        await visit(page, participantPath);
        await shoot(
          page,
          LOOP_OUT,
          `04-participant-${theme.label}-${width}.png`,
        );
      }
    }
    await setTheme("xi", xiTheme);

    if (youParticipant) {
      await size(page, 375, 812);
      await visit(page, participantPath);
      await evaluate(
        page,
        `window.localStorage.setItem('ww:you:xi', ${JSON.stringify(youParticipant.id)})`,
      );
      await visit(page, participantPath);
      await shoot(page, LOOP_OUT, "05-participant-you-highlight-375.png");
    } else {
      check(
        "Participant view: found a Participant on a finalist Team for the You highlight",
        false,
        "no Participant found on any Entrant Team",
      );
    }

    // --- Lifecycle screens, XI then IX -----------------------------------
    for (const theme of [
      { label: "xi", theme: xiTheme },
      { label: "ix", theme: ixTheme },
    ]) {
      if (theme.label === "ix") await setTheme("xi", theme.theme);
      for (const width of [375, 1280]) {
        await size(page, width, width === 375 ? 812 : 900);

        await visit(page, "/admin/setup");
        await shoot(
          page,
          LIFECYCLE_OUT,
          `01-setup-lifecycle-${theme.label}-${width}.png`,
        );

        await clickButtonMatching(page, "^End War Week$");
        await sleep(400);
        await shoot(
          page,
          LIFECYCLE_OUT,
          `02-end-dialog-${theme.label}-${width}.png`,
        );

        await visit(page, "/admin/setup/next");
        await shoot(
          page,
          LIFECYCLE_OUT,
          `03-setup-next-${theme.label}-${width}.png`,
        );
      }
    }
    await setTheme("xi", xiTheme);

    // --- The switcher + Archive banner: create XII (copying XI's settings),
    // then administer the complete edition X.
    const [source] = await query<{
      mode: string;
      team_label: string;
      leader_title: string;
      slack_channel_url: string;
      wiki_url: string | null;
      primary_color: string;
      primary_foreground_color: string;
      accent_color: string;
      background_color: string;
      foreground_color: string;
      font_preset: string;
      logo_url: string | null;
      banner_url: string | null;
      organizer_emails: string[];
    }>(`select * from war_week where edition = 'xi'`);
    await query(
      `insert into war_week (
         edition, edition_number, year, start_date, end_date, story_theme, status,
         mode, team_label, leader_title, slack_channel_url, wiki_url,
         primary_color, primary_foreground_color, accent_color, background_color,
         foreground_color, font_preset, logo_url, banner_url, organizer_emails
       ) values (
         'xii', $1, $2, current_date, current_date + 4, 'Copied from XI for evidence', 'upcoming',
         $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
       )`,
      [
        xiWarWeek.edition_number + 1,
        xiWarWeek.year + 1,
        source.mode,
        source.team_label,
        source.leader_title,
        source.slack_channel_url,
        source.wiki_url,
        source.primary_color,
        source.primary_foreground_color,
        source.accent_color,
        source.background_color,
        source.foreground_color,
        source.font_preset,
        source.logo_url,
        source.banner_url,
        [...new Set([...source.organizer_emails, EMAIL])],
      ],
    );

    await setCookie(page, ADMIN_EDITION_COOKIE, "x");
    for (const width of [375, 1280]) {
      await size(page, width, width === 375 ? 812 : 900);
      await visit(page, "/admin/setup");
      await shoot(
        page,
        LIFECYCLE_OUT,
        `04-archive-banner-switcher-${width}.png`,
      );
    }
    await clearCookie(page, ADMIN_EDITION_COOKIE);

    // --- Overflow sweep at 375/768/1280 -----------------------------------
    const widths = [375, 768, 1280];
    const routes = [
      builderPath,
      resultsPath,
      participantPath,
      "/admin/setup",
      "/admin/setup/next",
      "/xi/finale",
    ];
    for (const route of routes) {
      for (const width of widths) {
        await size(page, width, 900);
        await visit(page, route);
        recordOverflow(route, width, await overflow(page));
      }
    }

    writeFileSync(
      path.join(OVERFLOW_OUT, "overflow.txt"),
      overflowLines.join("\n") + "\n",
    );

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    // Clean up everything this script created.
    await query(`delete from competition where id = $1`, [competitionId]);
    await query(
      `delete from team where war_week_id = $1 and name in ('Gold', 'Green')`,
      [xiWarWeek.id],
    );
    await query(`delete from war_week where edition = 'xii'`);
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
