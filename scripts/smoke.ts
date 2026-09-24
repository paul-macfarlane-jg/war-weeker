import { loadEnvConfig } from "@next/env";
import { makeSignature } from "better-auth/crypto";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 30_000;

// The smoke never uses real OAuth credentials: it proves the app runs
// without them and signs its own session cookies with this secret.
const AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || `smoke-only-secret-${randomUUID()}`;
const SESSION_COOKIE = "better-auth.session_token";

const childEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_DRIVER: process.env.DATABASE_DRIVER,
  BETTER_AUTH_SECRET: AUTH_SECRET,
  BETTER_AUTH_URL: BASE_URL,
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
};

let failures = 0;

// Every page needs a sign-in, so page checks run as a signed-in JG user
// (a smoke session, set in main before the server starts).
let viewerCookie = "";

function signedInFetch(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: { cookie: viewerCookie, ...init.headers },
  });
}

function ok(check: string) {
  console.log(`ok - ${check}`);
}

function fail(check: string, detail: string) {
  failures += 1;
  console.log(`FAIL - ${check}: ${detail}`);
}

function runStep(command: string, args: string[], label: string) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: childEnv,
  });
  if (result.status !== 0) {
    fail(label, `exited with status ${result.status}`);
    return false;
  }
  ok(label);
  return true;
}

async function waitForReady(): Promise<boolean> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/sign-in`);
      if (res.status === 200) return true;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function portInUse(baseUrl: string): Promise<boolean> {
  try {
    await fetch(`${baseUrl}/`, { redirect: "manual" });
    return true;
  } catch {
    return false;
  }
}

/** Rows each table should hold for War Week XI after loading its seed. */
function expectedXiCounts(): Record<string, number> {
  const seed = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "seeds/xi.json"), "utf-8"),
  );
  const count = (list: unknown[] | undefined) => list?.length ?? 0;
  return {
    war_week: 1,
    day: count(seed.days),
    schedule_item: seed.days.reduce(
      (sum: number, d: { scheduleItems?: unknown[] }) =>
        sum + count(d.scheduleItems),
      0,
    ),
    team: count(seed.teams),
    participant: count(seed.participants),
    competition: count(seed.competitions),
    points_entry: count(seed.pointsEntries),
    award: count(seed.awards),
    announcement: count(seed.announcements),
    faq_item: count(seed.faqItems),
  };
}

const XI_COUNT_QUERIES: Record<string, string> = {
  war_week: "select count(*) from war_week where edition = 'xi'",
  day: "select count(*) from day join war_week w on w.id = day.war_week_id where w.edition = 'xi'",
  schedule_item:
    "select count(*) from schedule_item s join day d on d.id = s.day_id join war_week w on w.id = d.war_week_id where w.edition = 'xi'",
  team: "select count(*) from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi'",
  participant:
    "select count(*) from participant p join war_week w on w.id = p.war_week_id where w.edition = 'xi'",
  competition:
    "select count(*) from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi'",
  points_entry:
    "select count(*) from points_entry e join competition c on c.id = e.competition_id join war_week w on w.id = c.war_week_id where w.edition = 'xi'",
  award:
    "select count(*) from award a join war_week w on w.id = a.war_week_id where w.edition = 'xi'",
  announcement:
    "select count(*) from announcement a join war_week w on w.id = a.war_week_id where w.edition = 'xi'",
  faq_item:
    "select count(*) from faq_item f join war_week w on w.id = f.war_week_id where w.edition = 'xi'",
};

async function assertSeedLoadedOnce() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const expected = expectedXiCounts();
    for (const [table, query] of Object.entries(XI_COUNT_QUERIES)) {
      const check = `after loading the seed twice, War Week XI has ${expected[table]} ${table} rows`;
      const { rows } = await client.query<{ count: string }>(query);
      if (Number(rows[0]?.count) === expected[table]) {
        ok(check);
      } else {
        fail(check, `count=${rows[0]?.count}`);
      }
    }
  } catch (error) {
    fail("seed row counts", String(error));
  } finally {
    await client.end().catch(() => {});
  }
}

async function assertPointsEntryTargetConstraint() {
  const check =
    "the database rejects a Points Entry with both a Team and a Participant";
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query("begin");
    try {
      await client.query(
        `insert into points_entry (competition_id, team_id, participant_id, points, entered_by_email)
         select c.id, p.team_id, p.id, 1, 'smoke@jahnelgroup.com'
         from competition c
         join war_week w on w.id = c.war_week_id
         join participant p on p.war_week_id = w.id and p.team_id is not null
         where w.edition = 'xi'
         limit 1`,
      );
      fail(check, "insert succeeded");
    } catch (error) {
      const message = String(error);
      if (message.includes("points_entry_exactly_one_target")) {
        ok(check);
      } else {
        fail(check, message);
      }
    } finally {
      await client.query("rollback");
    }
  } catch (error) {
    fail(check, String(error));
  } finally {
    await client.end().catch(() => {});
  }
}

async function assertUnknownEdition404() {
  const check = "GET /zz returns 404";
  try {
    const res = await signedInFetch(`${BASE_URL}/zz`);
    if (res.status === 404) {
      ok(check);
    } else {
      fail(check, `status=${res.status}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertRootRedirect() {
  const check = "signed-in GET / redirects to /xi";
  try {
    const res = await signedInFetch(`${BASE_URL}/`, { redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status === 307 && location && location.endsWith("/xi")) {
      ok(check);
    } else {
      fail(check, `status=${res.status} location=${location}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertXiHome() {
  const check = "GET /xi renders War Week XI with Standings hidden";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi`);
    const body = await res.text();
    const hidden = body.includes("Standings hidden");
    if (res.status === 200 && body.includes("War Week XI") && hidden) {
      ok(check);
    } else {
      fail(
        check,
        `status=${res.status} bodyIncludes=${body.includes("War Week XI")} hidden=${hidden}`,
      );
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertLeaderboard() {
  const check =
    "GET /xi/leaderboard responds and shows Standings hidden for the demo seed";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/leaderboard`);
    const body = await res.text();
    const hidden = body.includes("Standings hidden");
    if (res.status === 200 && hidden) {
      ok(check);
    } else {
      fail(check, `status=${res.status} hidden=${hidden}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertSchedule() {
  const check =
    "GET /xi/schedule groups by Day with Day Themes, ET times and Competition links";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/schedule`);
    const body = await res.text();
    const checks = {
      dayTheme: body.includes("Red vs. Blue"),
      anchor: body.includes('id="day-2026-02-23"'),
      etTime: body.includes("7:00 AM ET"),
      competitionLink: body.includes('href="/xi/competitions/'),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertHomeNowNext() {
  const check =
    "GET /xi?at=<Tue Feb 24 12:30 ET> shows today's Day Theme and now/next";
  try {
    const at = encodeURIComponent("2026-02-24T12:30:00-05:00");
    const res = await signedInFetch(`${BASE_URL}/xi?at=${at}`);
    const body = await res.text();
    const checks = {
      dayTheme: body.includes("Red vs. Blue"),
      onNow:
        body.includes("On now") &&
        body.includes("Electric City Matrix - Day 2"),
      upNext: body.includes("Up next"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function runQuery<T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const { rows } = await client.query<T>(sql, params);
    return rows;
  } finally {
    await client.end().catch(() => {});
  }
}

async function assertMoreLinks() {
  const check = "GET /xi/more links to Competitions, Teams and history";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/more`);
    const body = await res.text();
    const checks = {
      competitions: body.includes('href="/xi/competitions"'),
      teams: body.includes('href="/xi/teams"'),
      history: body.includes('href="/history"'),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertHistory() {
  const check =
    "GET /history lists every complete War Week, newest first, each in its own theme";
  try {
    const res = await signedInFetch(`${BASE_URL}/history`);
    const body = await res.text();
    const complete = await runQuery<{ edition: string; primary: string }>(
      `select edition, primary_color as primary from war_week
         where status = 'complete' order by year desc`,
    );
    const positions = complete.map((w) => body.indexOf(`href="/${w.edition}"`));
    const checks = {
      allListed: positions.every((p) => p >= 0),
      newestFirst: positions.every((p, i) => i === 0 || p > positions[i - 1]),
      ownThemes: complete.every((w) => body.includes(`--primary:${w.primary}`)),
      excludesLive: !body.includes("The Matrix"),
    };
    if (
      res.status === 200 &&
      complete.length === 10 &&
      Object.values(checks).every(Boolean)
    ) {
      ok(check);
    } else {
      fail(
        check,
        `status=${res.status} complete=${complete.length} ${JSON.stringify(checks)}`,
      );
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertArchiveDetail() {
  const check =
    "GET /viii renders 2023 in its Harry Potter theme with stored winner, Houses, Awards, highlights and wiki link";
  try {
    const res = await signedInFetch(`${BASE_URL}/viii`);
    const body = await res.text();
    const checks = {
      theme: body.includes("--primary:#740001"),
      storyTheme: body.includes("Harry Potter: The Houses of Hogwarts"),
      winner: body.includes("Winner") && body.includes("Slytherin"),
      houses: ["Gryffindor", "Hufflepuff", "Ravenclaw"].every((h) =>
        body.includes(h),
      ),
      awards: body.includes("House Cup"),
      highlights: body.includes("Highlights"),
      wiki: body.includes(
        'href="https://sites.google.com/jahnelgroup.com/jahnel-group-wiki/war-week-2023"',
      ),
      noSlack: !body.includes("Join the Slack channel"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }

  const linkOnlyCheck =
    "GET /i, /ii, /iii render as link-only cards with the wiki link";
  try {
    const results = await Promise.all(
      [
        ["i", 2016],
        ["ii", 2017],
        ["iii", 2018],
      ].map(async ([edition, year]) => {
        const res = await signedInFetch(`${BASE_URL}/${edition}`);
        const body = await res.text();
        return {
          edition,
          status: res.status,
          linkOnly: body.includes("lives on") && !body.includes("Awards</h2>"),
          wiki: body.includes(
            `href="https://sites.google.com/jahnelgroup.com/jahnel-group-wiki/war-week-${year}"`,
          ),
        };
      }),
    );
    if (results.every((r) => r.status === 200 && r.linkOnly && r.wiki)) {
      ok(linkOnlyCheck);
    } else {
      fail(linkOnlyCheck, JSON.stringify(results));
    }
  } catch (error) {
    fail(linkOnlyCheck, String(error));
  }
}

async function assertCompetitions() {
  const check =
    "GET /xi/competitions groups Competitions with max points and scoring";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/competitions`);
    const body = await res.text();
    const checks = {
      group: body.includes("Team Night Events"),
      ungrouped: body.includes("Other Competitions"),
      maxPoints: body.includes("Max 1.5 pts"),
      scoring: body.includes("Individual · counts toward Team"),
      link: body.includes('href="/xi/competitions/'),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertCompetitionDetail() {
  let id: string | undefined;
  try {
    const rows = await runQuery<{ id: string }>(
      `select c.id from competition c join war_week w on w.id = c.war_week_id
       where w.edition = 'xi' and c.name = 'Winning the Day Challenge'`,
    );
    id = rows[0]?.id;
  } catch (error) {
    fail("look up the Winning the Day Challenge id", String(error));
    return;
  }
  if (!id) {
    fail("look up the Winning the Day Challenge id", "not found");
    return;
  }

  const url = `${BASE_URL}/xi/competitions/${id}`;
  const note = "First to finish all 10 wellness tasks";

  const hiddenCheck =
    "GET /xi/competitions/[id] shows the description and hides Points Entries while standings are hidden";
  try {
    const res = await signedInFetch(url);
    const body = await res.text();
    const checks = {
      name: body.includes("Winning the Day Challenge"),
      hidden: body.includes("Points hidden"),
      noEntry: !body.includes(note) && !body.includes("Dani Milliken"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(hiddenCheck);
    } else {
      fail(hiddenCheck, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(hiddenCheck, String(error));
  }

  // Briefly reveal XI to see the ledger, then hide it again. The smoke
  // resets every seed on its next run, so an interrupted run heals itself.
  const shownCheck =
    "GET /xi/competitions/[id] lists Points Entries (target, points, note) once standings are revealed";
  try {
    await runQuery(
      "update war_week set standings_hidden = false where edition = 'xi'",
    );
    const res = await signedInFetch(url);
    const body = await res.text();
    const checks = {
      target: body.includes("Dani Milliken"),
      note: body.includes(note),
      notHidden: !body.includes("Points hidden"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(shownCheck);
    } else {
      fail(shownCheck, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(shownCheck, String(error));
  } finally {
    await runQuery(
      "update war_week set standings_hidden = true where edition = 'xi'",
    ).catch((error) => fail("hide XI standings again", String(error)));
  }

  for (const bad of ["00000000-0000-4000-8000-000000000000", "not-a-uuid"]) {
    const check = `GET /xi/competitions/${bad} returns 404`;
    try {
      const res = await signedInFetch(`${BASE_URL}/xi/competitions/${bad}`);
      if (res.status === 404) {
        ok(check);
      } else {
        fail(check, `status=${res.status}`);
      }
    } catch (error) {
      fail(check, String(error));
    }
  }
}

async function assertTeams() {
  const check =
    "GET /xi/teams shows each Team with Leaders marked by Leader Title and Company Tags";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/teams`);
    const body = await res.text();
    const checks = {
      red: body.includes("Red"),
      blue: body.includes("Blue"),
      leaderTitle: body.includes(">Captain<"),
      leader: body.includes("Ashley Schuliger"),
      companyTag: body.includes(">LTI<"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

async function assertFreeForAllRoster() {
  const check =
    "GET /iv/teams shows one roster of all Participants for a free-for-all War Week";
  try {
    const res = await signedInFetch(`${BASE_URL}/iv/teams`);
    const body = await res.text();
    const checks = {
      heading: body.includes("Participants"),
      participant: body.includes("Ian Ballard"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }
}

type SmokeSession = { cookie: string };

// Smoke users never share an email with a real person, so cleanup can't
// touch a real account.
const SMOKE_EMAIL_PATTERN = "smoke-%@jahnelgroup.com";
const SMOKE_EMAIL_PATTERN_OUTSIDER = "smoke-%@example.com";
const SMOKE_ORGANIZER_EMAIL = "smoke-organizer@jahnelgroup.com";

/**
 * Inserts a user and a session straight into the database and returns the
 * session cookie better-auth would have set after a Google sign-in.
 */
async function createSmokeSession(email: string): Promise<SmokeSession> {
  const userId = `smoke-${randomUUID()}`;
  const token = `smoke-${randomUUID()}`;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query(
      `insert into "user" (id, name, email, email_verified) values ($1, 'Smoke', $2, true)`,
      [userId, email],
    );
    await client.query(
      `insert into session (id, token, user_id, expires_at) values ($1, $2, $3, now() + interval '1 day')`,
      [`smoke-${randomUUID()}`, token, userId],
    );
  } finally {
    await client.end().catch(() => {});
  }
  const signed = `${token}.${await makeSignature(token, AUTH_SECRET)}`;
  return { cookie: `${SESSION_COOKIE}=${encodeURIComponent(signed)}` };
}

/** Deletes every smoke user (and, by cascade, their sessions). */
async function deleteSmokeUsers() {
  await runQuery(`delete from "user" where email like $1 or email like $2`, [
    SMOKE_EMAIL_PATTERN,
    SMOKE_EMAIL_PATTERN_OUTSIDER,
  ]);
}

/** Adds or removes the smoke Organizer on War Week XI's allowlist. */
async function setSmokeOrganizer(on: boolean) {
  await runQuery(
    on
      ? `update war_week set organizer_emails = array_append(organizer_emails, $1) where edition = 'xi' and not ($1 = any(organizer_emails))`
      : `update war_week set organizer_emails = array_remove(organizer_emails, $1) where edition = 'xi'`,
    [SMOKE_ORGANIZER_EMAIL],
  );
}

async function assertSignInPage() {
  const check =
    "GET /sign-in renders without OAuth credentials and says Google isn't configured";
  try {
    const res = await fetch(`${BASE_URL}/sign-in?callbackURL=%2Fadmin`);
    const body = await res.text();
    const checks = {
      heading: body.includes("Sign in to War Weeker"),
      domain: body.includes("Use your @jahnelgroup.com Google account."),
      notConfigured: body.includes("configured on this server"),
    };
    if (res.status === 200 && Object.values(checks).every(Boolean)) {
      ok(check);
    } else {
      fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
    }
  } catch (error) {
    fail(check, String(error));
  }

  const sessionCheck = "GET /api/auth/get-session answers null with no session";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/get-session`);
    const body = await res.text();
    if (res.status === 200 && body.trim() === "null") {
      ok(sessionCheck);
    } else {
      fail(sessionCheck, `status=${res.status} body=${body.slice(0, 200)}`);
    }
  } catch (error) {
    fail(sessionCheck, String(error));
  }
}

async function assertAdminGate(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
  outsider: SmokeSession;
}) {
  const anonymousCheck = "anonymous GET /admin redirects to sign-in";
  try {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    if (
      res.status === 307 &&
      location.includes("/sign-in?callbackURL=%2Fadmin")
    ) {
      ok(anonymousCheck);
    } else {
      fail(anonymousCheck, `status=${res.status} location=${location}`);
    }
  } catch (error) {
    fail(anonymousCheck, String(error));
  }

  type AdminResult = { status: number; body: string; location: string };
  const shows = {
    "the admin shell": ({ status, body }: AdminResult) =>
      status === 200 &&
      body.includes("Organizer overview") &&
      body.includes("Admin sections"),
    "the refusal": ({ status, body }: AdminResult) =>
      status === 200 &&
      body.includes("Organizers only") &&
      !body.includes("Admin sections"),
    "sign-in": ({ status, location }: AdminResult) =>
      status === 307 && location.includes("/sign-in"),
  };

  for (const [label, session, expected] of [
    ["an allowlisted Organizer", sessions.organizer, "the admin shell"],
    [
      "a signed-in JG user off the allowlist",
      sessions.notOrganizer,
      "the refusal",
    ],
    ["a session with a non-JG email", sessions.outsider, "sign-in"],
  ] as const) {
    const check = `GET /admin as ${label} shows ${expected}`;
    try {
      const res = await fetch(`${BASE_URL}/admin`, {
        headers: { cookie: session.cookie },
        redirect: "manual",
      });
      const result = {
        status: res.status,
        body: await res.text(),
        location: res.headers.get("location") ?? "",
      };
      if (shows[expected](result)) {
        ok(check);
      } else {
        fail(check, `status=${result.status} location=${result.location}`);
      }
    } catch (error) {
      fail(check, String(error));
    }
  }
}

// Points Entries the smoke creates carry this note prefix so cleanup can
// find them (and never touch an Organizer's own entries).
const SMOKE_NOTE_PREFIX = "smoke-points-";

// Announcements the smoke creates carry this title prefix so cleanup can
// find them (and never touch a seeded Announcement).
const SMOKE_ANNOUNCEMENT_PREFIX = "smoke-announcement-";

type ActionResult = { ok: true } | { ok: false; error: string };

/** The build's server action ids, by exported name. */
function serverActionIds(): Record<string, string> {
  const manifest = JSON.parse(
    readFileSync(
      path.resolve(
        process.cwd(),
        ".next/server/server-reference-manifest.json",
      ),
      "utf-8",
    ),
  ) as { node: Record<string, { exportedName?: string }> };
  return Object.fromEntries(
    Object.entries(manifest.node).flatMap(([id, action]) =>
      action.exportedName ? [[action.exportedName, id]] : [],
    ),
  );
}

/**
 * Calls a server action the way the browser does: a POST with the action id
 * and the arguments as React's JSON reply, answered with an RSC payload that
 * carries the action's return value.
 */
async function callAction(
  actionId: string,
  args: unknown[],
  session: SmokeSession,
): Promise<ActionResult> {
  const res = await fetch(`${BASE_URL}/admin/points`, {
    method: "POST",
    headers: {
      "next-action": actionId,
      "content-type": "text/plain;charset=UTF-8",
      accept: "text/x-component",
      origin: BASE_URL,
      cookie: session.cookie,
    },
    body: JSON.stringify(args),
  });
  const body = await res.text();
  const line = body.split("\n").find((l) => /^\d+:\{"ok":/.test(l));
  if (res.status !== 200 || !line) {
    throw new Error(`status=${res.status} body=${body.slice(0, 300)}`);
  }
  return JSON.parse(line.slice(line.indexOf(":") + 1)) as ActionResult;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** A Team's total on the public leaderboard page, or null when not shown. */
async function leaderboardTeamTotal(teamName: string): Promise<number | null> {
  const res = await signedInFetch(`${BASE_URL}/xi/leaderboard`);
  const body = await res.text();
  const match = body.match(
    new RegExp(
      `font-semibold">${escapeHtml(teamName)}</span><span class="[^"]*">([-\\d.,]+)</span>`,
    ),
  );
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

async function smokeEntries() {
  return runQuery<{
    id: string;
    points: string;
    team_id: string | null;
    entered_by_email: string;
  }>(
    `select id, points, team_id, entered_by_email from points_entry where note like $1`,
    [`${SMOKE_NOTE_PREFIX}%`],
  );
}

async function deleteSmokeEntries() {
  await runQuery(`delete from points_entry where note like $1`, [
    `${SMOKE_NOTE_PREFIX}%`,
  ]);
}

async function smokeAnnouncements() {
  return runQuery<{
    id: string;
    title: string;
    author_email: string;
    published_at: string;
    pinned: boolean;
    body: string;
  }>(
    `select id, title, author_email, published_at, pinned, body::text as body
     from announcement where title like $1 order by published_at desc`,
    [`${SMOKE_ANNOUNCEMENT_PREFIX}%`],
  );
}

async function deleteSmokeAnnouncements() {
  await runQuery(`delete from announcement where title like $1`, [
    `${SMOKE_ANNOUNCEMENT_PREFIX}%`,
  ]);
}

async function assertAdminPointsPage(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  const check =
    "GET /admin/points as an Organizer shows the form with every Competition, the ledger with entered-by, and standings while hidden";
  try {
    const competitions = await runQuery<{ name: string }>(
      `select c.name from competition c join war_week w on w.id = c.war_week_id where w.edition = 'xi'`,
    );
    const [unscheduled] = await runQuery<{ count: string }>(
      `select count(*) from competition c join war_week w on w.id = c.war_week_id
       where w.edition = 'xi' and not exists (select 1 from schedule_item s where s.competition_id = c.id)`,
    );
    const [enteredBy] = await runQuery<{ email: string }>(
      `select pe.entered_by_email as email from points_entry pe
       join competition c on c.id = pe.competition_id
       join war_week w on w.id = c.war_week_id where w.edition = 'xi' limit 1`,
    );
    const res = await fetch(`${BASE_URL}/admin/points`, {
      headers: { cookie: sessions.organizer.cookie },
    });
    const body = await res.text();
    const missing = competitions
      .map((c) => c.name)
      .filter((name) => !body.includes(`>${escapeHtml(name)} · `));
    const result = {
      status: res.status,
      form: body.includes("Add a Points Entry"),
      missing: missing.join("|"),
      unscheduled: Number(unscheduled.count),
      ledger: Boolean(enteredBy) && body.includes(escapeHtml(enteredBy.email)),
      standings:
        body.includes("Hidden on the public site") &&
        body.includes("Individual leaderboard") &&
        /tabular-nums">[\d.,]+<\/span>/.test(body),
    };
    if (
      result.status === 200 &&
      result.form &&
      !result.missing &&
      result.ledger &&
      result.standings
    ) {
      ok(`${check} (${result.unscheduled} unscheduled Competitions offered)`);
    } else {
      fail(check, JSON.stringify(result));
    }
  } catch (error) {
    fail(check, String(error));
  }

  const refusedCheck = "GET /admin/points as a non-Organizer shows the refusal";
  try {
    const res = await fetch(`${BASE_URL}/admin/points`, {
      headers: { cookie: sessions.notOrganizer.cookie },
    });
    const body = await res.text();
    if (
      res.status === 200 &&
      body.includes("Organizers only") &&
      !body.includes("Add a Points Entry")
    ) {
      ok(refusedCheck);
    } else {
      fail(refusedCheck, `status=${res.status}`);
    }
  } catch (error) {
    fail(refusedCheck, String(error));
  }
}

async function assertPointsEntryActions(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  const ids = serverActionIds();
  const actions = [
    "createPointsEntry",
    "updatePointsEntry",
    "deletePointsEntry",
  ];
  const missing = actions.filter((name) => !ids[name]);
  if (missing.length > 0) {
    fail("server action ids in the build manifest", missing.join(", "));
    return;
  }
  const [teamCompetition] = await runQuery<{ id: string; max: string }>(
    `select c.id, c.max_points as max from competition c join war_week w on w.id = c.war_week_id
     where w.edition = 'xi' and c.scoring = 'team' and c.max_points is not null order by c.name limit 1`,
  );
  const [individualCompetition] = await runQuery<{ id: string }>(
    `select c.id from competition c join war_week w on w.id = c.war_week_id
     where w.edition = 'xi' and c.scoring = 'individual' order by c.name limit 1`,
  );
  const [target] = await runQuery<{
    team_id: string;
    team_name: string;
    participant_id: string;
  }>(
    `select t.id as team_id, t.name as team_name, p.id as participant_id
     from team t join war_week w on w.id = t.war_week_id
     join participant p on p.team_id = t.id where w.edition = 'xi' order by t.name limit 1`,
  );
  const [{ standings_hidden: wasHidden }] = await runQuery<{
    standings_hidden: boolean;
  }>(`select standings_hidden from war_week where edition = 'xi'`);

  const overMax = Number(teamCompetition.max) + 7;
  const teamInput = {
    competitionId: teamCompetition.id,
    targetId: target.team_id,
    points: String(overMax),
    note: `${SMOKE_NOTE_PREFIX}create`,
  };

  const run = async (check: string, body: () => Promise<string | null>) => {
    try {
      const problem = await body();
      if (problem === null) ok(check);
      else fail(check, problem);
    } catch (error) {
      fail(check, String(error));
    }
  };

  try {
    await deleteSmokeEntries();
    // The public-leaderboard check needs standings visible.
    await runQuery(
      `update war_week set standings_hidden = false where edition = 'xi'`,
    );
    const before = await leaderboardTeamTotal(target.team_name);

    await run(
      "createPointsEntry rejects a signed-in JG user off the allowlist",
      async () => {
        const result = await callAction(
          ids.createPointsEntry,
          [teamInput],
          sessions.notOrganizer,
        );
        const rows = await smokeEntries();
        return !result.ok &&
          /not an Organizer/.test(result.error) &&
          rows.length === 0
          ? null
          : `result=${JSON.stringify(result)} rows=${rows.length}`;
      },
    );

    await run(
      "createPointsEntry rejects a Participant in a team Competition and a Team in an individual one",
      async () => {
        const wrongTeam = await callAction(
          ids.createPointsEntry,
          [{ ...teamInput, targetId: target.participant_id }],
          sessions.organizer,
        );
        const wrongIndividual = await callAction(
          ids.createPointsEntry,
          [
            {
              ...teamInput,
              competitionId: individualCompetition.id,
              targetId: target.team_id,
            },
          ],
          sessions.organizer,
        );
        const rows = await smokeEntries();
        return !wrongTeam.ok && !wrongIndividual.ok && rows.length === 0
          ? null
          : `team=${JSON.stringify(wrongTeam)} individual=${JSON.stringify(wrongIndividual)} rows=${rows.length}`;
      },
    );

    await run(
      "createPointsEntry as an Organizer saves an over-max decimal entry with entered-by",
      async () => {
        const result = await callAction(
          ids.createPointsEntry,
          [{ ...teamInput, points: `${overMax}.25` }],
          sessions.organizer,
        );
        const rows = await smokeEntries();
        return result.ok &&
          rows.length === 1 &&
          Number(rows[0].points) === overMax + 0.25 &&
          rows[0].team_id === target.team_id &&
          rows[0].entered_by_email === SMOKE_ORGANIZER_EMAIL
          ? null
          : `result=${JSON.stringify(result)} rows=${JSON.stringify(rows)}`;
      },
    );

    await run(
      "an entry saved in admin shows up on /xi/leaderboard (un-hidden) on the next refresh",
      async () => {
        const after = await leaderboardTeamTotal(target.team_name);
        return before !== null &&
          after !== null &&
          Math.abs(after - before - (overMax + 0.25)) < 0.001
          ? null
          : `before=${before} after=${after}`;
      },
    );

    const [created] = await smokeEntries();
    await run(
      "updatePointsEntry and deletePointsEntry reject a non-Organizer",
      async () => {
        const update = await callAction(
          ids.updatePointsEntry,
          [created.id, { ...teamInput, points: "1" }],
          sessions.notOrganizer,
        );
        const remove = await callAction(
          ids.deletePointsEntry,
          [created.id],
          sessions.notOrganizer,
        );
        const [row] = await smokeEntries();
        return !update.ok &&
          !remove.ok &&
          row &&
          Number(row.points) === overMax + 0.25
          ? null
          : `update=${JSON.stringify(update)} delete=${JSON.stringify(remove)} row=${JSON.stringify(row)}`;
      },
    );

    await run(
      "updatePointsEntry as an Organizer edits points and keeps entered-by",
      async () => {
        const result = await callAction(
          ids.updatePointsEntry,
          [created.id, { ...teamInput, points: "1.5" }],
          sessions.organizer,
        );
        const [row] = await smokeEntries();
        return result.ok &&
          Number(row?.points) === 1.5 &&
          row?.entered_by_email === SMOKE_ORGANIZER_EMAIL
          ? null
          : `result=${JSON.stringify(result)} row=${JSON.stringify(row)}`;
      },
    );

    await run("deletePointsEntry as an Organizer removes it", async () => {
      const result = await callAction(
        ids.deletePointsEntry,
        [created.id],
        sessions.organizer,
      );
      const rows = await smokeEntries();
      return result.ok && rows.length === 0
        ? null
        : `result=${JSON.stringify(result)} rows=${rows.length}`;
    });
  } finally {
    await deleteSmokeEntries().catch((error) =>
      fail("delete smoke Points Entries", String(error)),
    );
    await runQuery(
      `update war_week set standings_hidden = $1 where edition = 'xi'`,
      [wasHidden],
    ).catch((error) => fail("restore XI standings_hidden", String(error)));
  }
}

/** Calls MCP `get_leaderboard` and returns its raw text and parsed payload. */
async function mcpLeaderboard(kind: "team" | "individual") {
  const init = await mcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "smoke-test", version: "0.1.0" },
    },
  });
  const call = await mcpRequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_leaderboard", arguments: { kind } },
    },
    init.sessionId,
  );
  const text =
    (
      call.json?.result as
        { content?: { type: string; text: string }[] } | undefined
    )?.content?.[0]?.text ?? "";
  return { text, parsed: text ? JSON.parse(text) : undefined };
}

async function xiStandingsHidden(): Promise<boolean> {
  const [row] = await runQuery<{ standings_hidden: boolean }>(
    `select standings_hidden from war_week where edition = 'xi'`,
  );
  return row.standings_hidden;
}

/**
 * Whether `/xi` and `/xi/leaderboard` both show the hidden state. When
 * hidden, their RSC payloads (what the client components receive) must
 * carry no totals either.
 */
async function publicPagesHidden(): Promise<{
  hidden: boolean;
  leak: boolean;
}> {
  let hidden = true;
  let leak = false;
  for (const target of ["/xi", "/xi/leaderboard"]) {
    const html = await (await signedInFetch(`${BASE_URL}${target}`)).text();
    const rsc = await (
      await signedInFetch(`${BASE_URL}${target}`, { headers: { RSC: "1" } })
    ).text();
    hidden &&= html.includes("Standings hidden");
    leak ||= html.includes('"total":') || rsc.includes('"total":');
  }
  return { hidden, leak };
}

async function assertHideAndReveal(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  const run = async (check: string, body: () => Promise<string | null>) => {
    try {
      const problem = await body();
      if (problem === null) ok(check);
      else fail(check, problem);
    } catch (error) {
      fail(check, String(error));
    }
  };

  await run(
    "while hidden, /xi and /xi/leaderboard HTML and RSC payloads carry no totals",
    async () => {
      const pages = await publicPagesHidden();
      return pages.hidden && !pages.leak ? null : JSON.stringify(pages);
    },
  );

  await run(
    "GET /admin/standings shows the Reveal control to an Organizer and the refusal to a non-Organizer",
    async () => {
      const page = async (session: SmokeSession) =>
        (
          await fetch(`${BASE_URL}/admin/standings`, {
            headers: { cookie: session.cookie },
          })
        ).text();
      const organizer = await page(sessions.organizer);
      const notOrganizer = await page(sessions.notOrganizer);
      const checks = {
        heading: organizer.includes("Standings visibility"),
        state: organizer.includes("Standings are hidden"),
        reveal: organizer.includes(">Reveal<"),
        refused:
          notOrganizer.includes("Organizers only") &&
          !notOrganizer.includes(">Reveal<"),
      };
      return Object.values(checks).every(Boolean)
        ? null
        : JSON.stringify(checks);
    },
  );

  const ids = serverActionIds();
  const missing = ["hideStandings", "revealStandings"].filter(
    (name) => !ids[name],
  );
  if (missing.length > 0) {
    fail("server action ids in the build manifest", missing.join(", "));
    return;
  }

  const wasHidden = await xiStandingsHidden();
  try {
    await runQuery(
      `update war_week set standings_hidden = true where edition = 'xi'`,
    );

    await run(
      "revealStandings rejects a signed-in JG user off the allowlist",
      async () => {
        const result = await callAction(
          ids.revealStandings,
          [],
          sessions.notOrganizer,
        );
        const hidden = await xiStandingsHidden();
        return !result.ok && /not an Organizer/.test(result.error) && hidden
          ? null
          : `result=${JSON.stringify(result)} hidden=${hidden}`;
      },
    );

    await run(
      "revealStandings as an Organizer shows Standings on /xi, /xi/leaderboard and MCP get_leaderboard",
      async () => {
        const result = await callAction(
          ids.revealStandings,
          [],
          sessions.organizer,
        );
        const hidden = await xiStandingsHidden();
        const pages = await publicPagesHidden();
        const [{ name: teamName }] = await runQuery<{ name: string }>(
          `select t.name from team t join war_week w on w.id = t.war_week_id where w.edition = 'xi' order by t.name limit 1`,
        );
        const total = await leaderboardTeamTotal(teamName);
        const mcp = await mcpLeaderboard("team");
        const checks = {
          ok: result.ok,
          flag: !hidden,
          pages: !pages.hidden,
          // Proves the no-totals check above can see totals when they exist.
          totalsInPayload: pages.leak,
          total: total !== null,
          mcp:
            mcp.parsed?.hidden === false &&
            mcp.parsed.standings.length > 0 &&
            mcp.parsed.standings.every(
              (row: { total: unknown }) => typeof row.total === "number",
            ),
        };
        return Object.values(checks).every(Boolean)
          ? null
          : `${JSON.stringify(checks)} result=${JSON.stringify(result)}`;
      },
    );

    await run(
      "hideStandings rejects a signed-in JG user off the allowlist",
      async () => {
        const result = await callAction(
          ids.hideStandings,
          [],
          sessions.notOrganizer,
        );
        const hidden = await xiStandingsHidden();
        return !result.ok && /not an Organizer/.test(result.error) && !hidden
          ? null
          : `result=${JSON.stringify(result)} hidden=${hidden}`;
      },
    );

    await run(
      "hideStandings as an Organizer returns /xi, /xi/leaderboard and MCP get_leaderboard to hidden",
      async () => {
        const result = await callAction(
          ids.hideStandings,
          [],
          sessions.organizer,
        );
        const hidden = await xiStandingsHidden();
        const pages = await publicPagesHidden();
        const mcp = await Promise.all(
          (["team", "individual"] as const).map(mcpLeaderboard),
        );
        const checks = {
          ok: result.ok,
          flag: hidden,
          pages: pages.hidden && !pages.leak,
          mcp: mcp.every(
            ({ text, parsed }) => parsed?.hidden === true && !/\d/.test(text),
          ),
        };
        return Object.values(checks).every(Boolean)
          ? null
          : `${JSON.stringify(checks)} result=${JSON.stringify(result)}`;
      },
    );
  } finally {
    await runQuery(
      `update war_week set standings_hidden = $1 where edition = 'xi'`,
      [wasHidden],
    ).catch((error) => fail("restore XI standings_hidden", String(error)));
  }
}

/** AC1: pinned first, then newest first; AC2: an allow-listed embed. */
async function assertAnnouncementFeed() {
  const check =
    "GET /xi/news orders the pinned welcome first, then Wellness Wednesday, then Tournament Night recap";
  let body = "";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/news`);
    body = await res.text();
    const positions = {
      welcome: body.indexOf("Welcome to War Week XI"),
      wellness: body.indexOf("Wellness Wednesday is here"),
      recap: body.indexOf("Tournament Night recap"),
    };
    const ordered =
      positions.welcome >= 0 &&
      positions.wellness > positions.welcome &&
      positions.recap > positions.wellness;
    if (res.status === 200 && ordered) {
      ok(check);
    } else {
      fail(
        check,
        `status=${res.status} positions=${JSON.stringify(positions)}`,
      );
    }
  } catch (error) {
    fail(check, String(error));
    return;
  }

  const embedCheck =
    "GET /xi/news embeds the welcome Announcement's video as a YouTube iframe";
  if (
    /<iframe[^>]*src="https:\/\/www\.youtube-nocookie\.com\/embed\/vKQi3bBA1y8"/.test(
      body,
    )
  ) {
    ok(embedCheck);
  } else {
    fail(embedCheck, "no matching iframe src found");
  }
}

/** AC3: the pinned Announcement shows on the edition home. */
async function assertAnnouncementHomePinned() {
  const check = "GET /xi shows a Pinned section with the welcome Announcement";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi`);
    const body = await res.text();
    if (
      res.status === 200 &&
      body.includes(">Pinned<") &&
      body.includes("Welcome to War Week XI")
    ) {
      ok(check);
    } else {
      fail(check, `status=${res.status}`);
    }
  } catch (error) {
    fail(check, String(error));
  }

  const badgeCheck = "GET /xi/news and /xi both show the Pinned badge";
  const pinnedBadge = /<span[^>]*>Pinned<\/span>/;
  try {
    const news = await (await signedInFetch(`${BASE_URL}/xi/news`)).text();
    const home = await (await signedInFetch(`${BASE_URL}/xi`)).text();
    if (pinnedBadge.test(news) && pinnedBadge.test(home)) {
      ok(badgeCheck);
    } else {
      fail(badgeCheck, "Pinned badge markup missing on one of the pages");
    }
  } catch (error) {
    fail(badgeCheck, String(error));
  }
}

/** AC4: Organizer-only create/edit/pin/unpin/delete, recording author/published-at. */
async function assertAnnouncementActions(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  const ids = serverActionIds();
  const actions = [
    "createAnnouncement",
    "updateAnnouncement",
    "deleteAnnouncement",
    "pinAnnouncement",
    "unpinAnnouncement",
  ];
  const missing = actions.filter((name) => !ids[name]);
  if (missing.length > 0) {
    fail("server action ids in the build manifest", missing.join(", "));
    return;
  }

  const run = async (check: string, body: () => Promise<string | null>) => {
    try {
      const problem = await body();
      if (problem === null) ok(check);
      else fail(check, problem);
    } catch (error) {
      fail(check, String(error));
    }
  };

  const validBody = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "smoke body" }] },
    ],
  };
  const editedTitle = `${SMOKE_ANNOUNCEMENT_PREFIX}edited`;

  try {
    await deleteSmokeAnnouncements();

    await run(
      "createAnnouncement rejects a signed-in JG user off the allowlist",
      async () => {
        const result = await callAction(
          ids.createAnnouncement,
          [
            {
              title: `${SMOKE_ANNOUNCEMENT_PREFIX}refused`,
              body: validBody,
              videoUrls: [],
              pinned: false,
            },
          ],
          sessions.notOrganizer,
        );
        const rows = await smokeAnnouncements();
        return !result.ok &&
          /not an Organizer/.test(result.error) &&
          rows.length === 0
          ? null
          : `result=${JSON.stringify(result)} rows=${rows.length}`;
      },
    );

    await run(
      "createAnnouncement rejects a disallowed video URL (AC2)",
      async () => {
        const result = await callAction(
          ids.createAnnouncement,
          [
            {
              title: `${SMOKE_ANNOUNCEMENT_PREFIX}bad-video`,
              body: validBody,
              videoUrls: ["https://evil.example.com/watch?v=1"],
              pinned: false,
            },
          ],
          sessions.organizer,
        );
        const rows = await smokeAnnouncements();
        return !result.ok &&
          /YouTube, Loom, Vimeo or Google Drive/.test(result.error) &&
          rows.length === 0
          ? null
          : `result=${JSON.stringify(result)} rows=${rows.length}`;
      },
    );

    await run(
      "createAnnouncement as an Organizer saves a valid Announcement with author-email and a recent published-at",
      async () => {
        const result = await callAction(
          ids.createAnnouncement,
          [
            {
              title: `${SMOKE_ANNOUNCEMENT_PREFIX}created`,
              body: validBody,
              videoUrls: ["https://youtu.be/dQw4w9WgXcQ"],
              pinned: false,
            },
          ],
          sessions.organizer,
        );
        const rows = await smokeAnnouncements();
        const row = rows[0];
        const publishedRecent =
          row != null &&
          Date.now() - new Date(row.published_at).getTime() < 60_000;
        return result.ok &&
          rows.length === 1 &&
          row.author_email === SMOKE_ORGANIZER_EMAIL &&
          publishedRecent
          ? null
          : `result=${JSON.stringify(result)} rows=${JSON.stringify(rows)}`;
      },
    );

    const [created] = await smokeAnnouncements();

    if (!created) {
      fail(
        "look up the just-created smoke Announcement",
        "smokeAnnouncements() returned no rows",
      );
    } else {
      await run(
        "updateAnnouncement, pinAnnouncement, unpinAnnouncement and deleteAnnouncement each reject a non-Organizer and leave the row unchanged",
        async () => {
          const update = await callAction(
            ids.updateAnnouncement,
            [
              created.id,
              {
                title: "should-not-apply",
                body: validBody,
                videoUrls: [],
                pinned: true,
              },
            ],
            sessions.notOrganizer,
          );
          const pin = await callAction(
            ids.pinAnnouncement,
            [created.id],
            sessions.notOrganizer,
          );
          const unpin = await callAction(
            ids.unpinAnnouncement,
            [created.id],
            sessions.notOrganizer,
          );
          const remove = await callAction(
            ids.deleteAnnouncement,
            [created.id],
            sessions.notOrganizer,
          );
          const [row] = await smokeAnnouncements();
          const refused = [update, pin, unpin, remove].every(
            (result) => !result.ok && /not an Organizer/.test(result.error),
          );
          const unchanged =
            row != null &&
            row.title === created.title &&
            row.pinned === created.pinned;
          return refused && unchanged
            ? null
            : `update=${JSON.stringify(update)} pin=${JSON.stringify(pin)} unpin=${JSON.stringify(unpin)} delete=${JSON.stringify(remove)} row=${JSON.stringify(row)}`;
        },
      );

      await run(
        "updateAnnouncement changes the title and keeps author-email and published-at",
        async () => {
          const result = await callAction(
            ids.updateAnnouncement,
            [
              created.id,
              {
                title: editedTitle,
                body: validBody,
                videoUrls: ["https://youtu.be/dQw4w9WgXcQ"],
                pinned: false,
              },
            ],
            sessions.organizer,
          );
          const [row] = await smokeAnnouncements();
          return result.ok &&
            row?.title === editedTitle &&
            row.author_email === created.author_email &&
            new Date(row.published_at).getTime() ===
              new Date(created.published_at).getTime()
            ? null
            : `result=${JSON.stringify(result)} row=${JSON.stringify(row)}`;
        },
      );

      await run(
        "pinAnnouncement pins it, and it now sorts first on /xi/news",
        async () => {
          const result = await callAction(
            ids.pinAnnouncement,
            [created.id],
            sessions.organizer,
          );
          const [row] = await smokeAnnouncements();
          const body = await (
            await signedInFetch(`${BASE_URL}/xi/news`)
          ).text();
          const welcomePos = body.indexOf("Welcome to War Week XI");
          const editedPos = body.indexOf(editedTitle);
          return result.ok &&
            row?.pinned === true &&
            editedPos >= 0 &&
            editedPos < welcomePos
            ? null
            : `result=${JSON.stringify(result)} pinned=${row?.pinned} welcomePos=${welcomePos} editedPos=${editedPos}`;
        },
      );

      await run(
        "unpinAnnouncement unpins it, and the welcome Announcement sorts first again",
        async () => {
          const result = await callAction(
            ids.unpinAnnouncement,
            [created.id],
            sessions.organizer,
          );
          const [row] = await smokeAnnouncements();
          const body = await (
            await signedInFetch(`${BASE_URL}/xi/news`)
          ).text();
          const welcomePos = body.indexOf("Welcome to War Week XI");
          const editedPos = body.indexOf(editedTitle);
          return result.ok &&
            row?.pinned === false &&
            welcomePos >= 0 &&
            welcomePos < editedPos
            ? null
            : `result=${JSON.stringify(result)} pinned=${row?.pinned} welcomePos=${welcomePos} editedPos=${editedPos}`;
        },
      );

      await run("deleteAnnouncement as an Organizer removes it", async () => {
        const result = await callAction(
          ids.deleteAnnouncement,
          [created.id],
          sessions.organizer,
        );
        const rows = await smokeAnnouncements();
        return result.ok && rows.length === 0
          ? null
          : `result=${JSON.stringify(result)} rows=${rows.length}`;
      });
    }

    await run(
      "deleteAnnouncement of an id that no longer exists says so",
      async () => {
        const result = await callAction(
          ids.deleteAnnouncement,
          ["00000000-0000-4000-8000-000000000000"],
          sessions.organizer,
        );
        return !result.ok && /no longer exists/.test(result.error)
          ? null
          : `result=${JSON.stringify(result)}`;
      },
    );
  } finally {
    await deleteSmokeAnnouncements().catch((error) =>
      fail("delete smoke Announcements", String(error)),
    );
  }
}

/** AC5: unsafe content is stripped on write, not just rejected outright. */
async function assertAnnouncementUnsafeContentStripped(sessions: {
  organizer: SmokeSession;
}) {
  const ids = serverActionIds();
  if (!ids.createAnnouncement) {
    fail(
      "server action id createAnnouncement in the build manifest",
      "missing",
    );
    return;
  }

  const check =
    "createAnnouncement strips a javascript: link, a data: image and an unrecognized iframe block on write";
  const unsafeBody = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "click",
            marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
          },
        ],
      },
      { type: "image", attrs: { src: "data:image/png;base64,AAAA", alt: "" } },
      { type: "iframe", attrs: { src: "https://evil.example.com" } },
    ],
  };

  try {
    await deleteSmokeAnnouncements();
    const result = await callAction(
      ids.createAnnouncement,
      [
        {
          title: `${SMOKE_ANNOUNCEMENT_PREFIX}unsafe`,
          body: unsafeBody,
          videoUrls: [],
          pinned: false,
        },
      ],
      sessions.organizer,
    );
    const rows = await smokeAnnouncements();
    const storedBody = rows[0]?.body ?? "";
    const clean =
      !storedBody.includes("javascript:") &&
      !storedBody.includes("data:image") &&
      !storedBody.includes('"iframe"');
    if (!result.ok || rows.length !== 1 || !clean) {
      fail(check, `result=${JSON.stringify(result)} body=${storedBody}`);
      return;
    }

    const feed = await (await signedInFetch(`${BASE_URL}/xi/news`)).text();
    if (feed.includes("javascript:")) {
      fail(check, "rendered /xi/news still contains javascript:");
      return;
    }
    ok(check);
  } catch (error) {
    fail(check, String(error));
  } finally {
    await deleteSmokeAnnouncements().catch((error) =>
      fail("delete smoke Announcements", String(error)),
    );
  }
}

/** /admin/announcements, its New form and the edit form for a seeded row. */
async function assertAnnouncementAdminPages(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  const listCheck =
    "GET /admin/announcements as an Organizer lists the seeded titles and New Announcement, and refuses a non-Organizer";
  try {
    const organizerRes = await fetch(`${BASE_URL}/admin/announcements`, {
      headers: { cookie: sessions.organizer.cookie },
    });
    const organizerBody = await organizerRes.text();
    const titles = [
      "Welcome to War Week XI",
      "Tournament Night recap",
      "Wellness Wednesday is here",
    ];
    const hasAllTitles = titles.every((title) => organizerBody.includes(title));
    const notOrganizerRes = await fetch(`${BASE_URL}/admin/announcements`, {
      headers: { cookie: sessions.notOrganizer.cookie },
    });
    const notOrganizerBody = await notOrganizerRes.text();
    if (
      organizerRes.status === 200 &&
      hasAllTitles &&
      organizerBody.includes("New Announcement") &&
      notOrganizerRes.status === 200 &&
      notOrganizerBody.includes("Organizers only")
    ) {
      ok(listCheck);
    } else {
      fail(
        listCheck,
        `organizerStatus=${organizerRes.status} hasAllTitles=${hasAllTitles} notOrganizerStatus=${notOrganizerRes.status}`,
      );
    }
  } catch (error) {
    fail(listCheck, String(error));
  }

  const newCheck =
    "GET /admin/announcements/new as an Organizer shows the Announcement form";
  try {
    const res = await fetch(`${BASE_URL}/admin/announcements/new`, {
      headers: { cookie: sessions.organizer.cookie },
    });
    const body = await res.text();
    if (res.status === 200 && body.includes('aria-label="Announcement"')) {
      ok(newCheck);
    } else {
      fail(newCheck, `status=${res.status}`);
    }
  } catch (error) {
    fail(newCheck, String(error));
  }

  const editCheck =
    "GET /admin/announcements/[id] as an Organizer shows Edit Announcement for the seeded welcome Announcement";
  try {
    const [welcome] = await runQuery<{ id: string }>(
      `select a.id from announcement a join war_week w on w.id = a.war_week_id
       where w.edition = 'xi' and a.title = 'Welcome to War Week XI'`,
    );
    const res = await fetch(`${BASE_URL}/admin/announcements/${welcome.id}`, {
      headers: { cookie: sessions.organizer.cookie },
    });
    const body = await res.text();
    if (res.status === 200 && body.includes("Edit Announcement")) {
      ok(editCheck);
    } else {
      fail(editCheck, `status=${res.status}`);
    }
  } catch (error) {
    fail(editCheck, String(error));
  }
}

async function assertSignInRequired() {
  for (const target of ["/", "/xi", "/xi/leaderboard"]) {
    const check = `anonymous GET ${target} redirects to sign-in`;
    try {
      const res = await fetch(`${BASE_URL}${target}`, { redirect: "manual" });
      const location = res.headers.get("location") ?? "";
      const callback = `callbackURL=${encodeURIComponent(target)}`;
      if (
        res.status === 307 &&
        location.includes("/sign-in?") &&
        location.includes(callback)
      ) {
        ok(check);
      } else {
        fail(check, `status=${res.status} location=${location}`);
      }
    } catch (error) {
      fail(check, String(error));
    }
  }

  const mcpCheck = "anonymous POST /api/mcp answers 401";
  try {
    const { status } = await mcpRequest(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "smoke-test", version: "0.1.0" },
        },
      },
      undefined,
      "",
    ).catch(() => ({ status: -1 }));
    if (status === 401) {
      ok(mcpCheck);
    } else {
      fail(mcpCheck, `status=${status}`);
    }
  } catch (error) {
    fail(mcpCheck, String(error));
  }
}

async function assertAdminLink(sessions: {
  organizer: SmokeSession;
  notOrganizer: SmokeSession;
}) {
  for (const [label, session, expected] of [
    ["an Organizer", sessions.organizer, true],
    ["a non-Organizer", sessions.notOrganizer, false],
  ] as const) {
    const check = `GET /xi/more as ${label} ${expected ? "shows" : "hides"} the Admin link and shows the account`;
    try {
      const res = await fetch(`${BASE_URL}/xi/more`, {
        headers: { cookie: session.cookie },
      });
      const body = await res.text();
      const checks = {
        admin: body.includes('href="/admin"') === expected,
        account: body.includes("Signed in as") && body.includes("Sign out"),
      };
      if (res.status === 200 && Object.values(checks).every(Boolean)) {
        ok(check);
      } else {
        fail(check, `status=${res.status} ${JSON.stringify(checks)}`);
      }
    } catch (error) {
      fail(check, String(error));
    }
  }
}

async function mcpRequest(
  body: Record<string, unknown>,
  sessionId?: string,
  cookie = viewerCookie,
): Promise<{
  status: number;
  json: Record<string, unknown> | undefined;
  sessionId: string | undefined;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (cookie) headers.cookie = cookie;
  if (sessionId) headers["mcp-session-id"] = sessionId;

  const res = await fetch(`${BASE_URL}/api/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  let json: Record<string, unknown> | undefined;
  if (contentType.includes("text/event-stream")) {
    const dataLines = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .filter(Boolean);
    const lastData = dataLines[dataLines.length - 1];
    if (lastData) json = JSON.parse(lastData);
  } else if (text) {
    json = JSON.parse(text);
  }

  return {
    status: res.status,
    json,
    sessionId: res.headers.get("mcp-session-id") ?? undefined,
  };
}

async function assertMcp() {
  try {
    const init = await mcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "0.1.0" },
      },
    });
    const sessionId = init.sessionId;

    const toolsList = await mcpRequest(
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      sessionId,
    );
    const tools =
      (toolsList.json?.result as { tools?: { name: string }[] } | undefined)
        ?.tools ?? [];
    for (const name of [
      "get_current_war_week",
      "get_leaderboard",
      "get_schedule",
      "get_announcements",
      "list_history",
      "get_history",
    ]) {
      if (tools.some((tool) => tool.name === name)) {
        ok(`MCP tools/list includes ${name}`);
      } else {
        fail(
          `MCP tools/list includes ${name}`,
          `tools=${JSON.stringify(tools)}`,
        );
      }
    }

    const call = await mcpRequest(
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_current_war_week", arguments: {} },
      },
      sessionId,
    );
    const result = call.json?.result as
      { content?: { type: string; text: string }[] } | undefined;
    const text = result?.content?.[0]?.text;
    const parsed = text ? JSON.parse(text) : undefined;

    if (parsed?.edition === "xi") {
      ok("MCP tools/call get_current_war_week returns edition xi");
    } else {
      fail(
        "MCP tools/call get_current_war_week returns edition xi",
        `result=${JSON.stringify(call.json)}`,
      );
    }

    for (const [id, kind] of [
      [4, "team"],
      [5, "individual"],
    ] as const) {
      const check = `MCP get_leaderboard(${kind}) returns the hidden result with no numbers`;
      const leaderboard = await mcpRequest(
        {
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: { name: "get_leaderboard", arguments: { kind } },
        },
        sessionId,
      );
      const text = (
        leaderboard.json?.result as
          { content?: { type: string; text: string }[] } | undefined
      )?.content?.[0]?.text;
      const parsed = text ? JSON.parse(text) : undefined;
      if (
        parsed?.hidden === true &&
        String(parsed.message).includes("hidden until closing ceremonies") &&
        !/\d/.test(text!)
      ) {
        ok(check);
      } else {
        fail(check, `result=${JSON.stringify(leaderboard.json)}`);
      }
    }

    for (const [id, args, check, expectDays] of [
      [
        6,
        { date: "2026-02-24" },
        "MCP get_schedule(2026-02-24) returns only that Day",
        ["2026-02-24"],
      ],
      [7, {}, "MCP get_schedule() returns all six XI Days", 6],
    ] as const) {
      const schedule = await mcpRequest(
        {
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: { name: "get_schedule", arguments: args },
        },
        sessionId,
      );
      const text = (
        schedule.json?.result as
          { content?: { type: string; text: string }[] } | undefined
      )?.content?.[0]?.text;
      const parsed = text ? JSON.parse(text) : undefined;
      const days = parsed?.days as
        { date: string; dayTheme: string; items: unknown[] }[] | undefined;
      const passed =
        parsed?.timeZone === "America/New_York" &&
        Array.isArray(days) &&
        (typeof expectDays === "number"
          ? days.length === expectDays
          : days.length === 1 &&
            days[0].date === expectDays[0] &&
            days[0].dayTheme === "Red vs. Blue" &&
            days[0].items.length > 0);
      if (passed) {
        ok(check);
      } else {
        fail(check, `result=${JSON.stringify(schedule.json)}`);
      }
    }

    const callTool = async (
      id: number,
      name: string,
      args: Record<string, unknown>,
    ) => {
      const res = await mcpRequest(
        {
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: { name, arguments: args },
        },
        sessionId,
      );
      const text = (
        res.json?.result as
          { content?: { type: string; text: string }[] } | undefined
      )?.content?.[0]?.text;
      return { raw: res.json, parsed: text ? JSON.parse(text) : undefined };
    };

    const announcementsLimited = await callTool(12, "get_announcements", {
      limit: 2,
    });
    const limited = announcementsLimited.parsed as
      | {
          edition: string;
          announcements: {
            title: string;
            pinned: boolean;
            videoUrls: string[];
            body: string | null;
          }[];
        }
      | undefined;
    const firstAnnouncement = limited?.announcements?.[0];
    const limitedCheck =
      "MCP get_announcements(limit: 2) returns edition xi, 2 Announcements, welcome pinned first with its video and body";
    if (
      limited?.edition === "xi" &&
      limited.announcements.length === 2 &&
      firstAnnouncement?.pinned === true &&
      firstAnnouncement.title === "Welcome to War Week XI" &&
      firstAnnouncement.videoUrls.includes(
        "https://www.youtube.com/watch?v=vKQi3bBA1y8",
      ) &&
      typeof firstAnnouncement.body === "string" &&
      firstAnnouncement.body.length > 0 &&
      firstAnnouncement.body.includes("Choose your pill")
    ) {
      ok(limitedCheck);
    } else {
      fail(limitedCheck, `result=${JSON.stringify(announcementsLimited.raw)}`);
    }

    const announcementsAll = await callTool(13, "get_announcements", {});
    const allCount = (
      announcementsAll.parsed as { announcements?: unknown[] } | undefined
    )?.announcements?.length;
    const allCheck = "MCP get_announcements() returns all 3 Announcements";
    if (allCount === 3) {
      ok(allCheck);
    } else {
      fail(allCheck, `result=${JSON.stringify(announcementsAll.raw)}`);
    }

    const list = await callTool(8, "list_history", {});
    const years = (
      list.parsed?.warWeeks as { year: number }[] | undefined
    )?.map((w) => w.year);
    const expectedYears = Array.from({ length: 10 }, (_, i) => 2025 - i);
    if (JSON.stringify(years) === JSON.stringify(expectedYears)) {
      ok("MCP list_history returns 2025 down to 2016");
    } else {
      fail(
        "MCP list_history returns 2025 down to 2016",
        `result=${JSON.stringify(list.raw)}`,
      );
    }

    const y2023 = await callTool(9, "get_history", { year: 2023 });
    const p = y2023.parsed;
    if (
      p?.found === true &&
      p.edition === "viii" &&
      p.winner === "Slytherin" &&
      p.teams?.length === 4 &&
      p.awards?.some((a: { name: string }) => a.name === "House Cup") &&
      p.highlights?.length > 0 &&
      String(p.wikiUrl).endsWith("war-week-2023")
    ) {
      ok(
        "MCP get_history(2023) returns the stored winner, Houses, Awards and wiki link",
      );
    } else {
      fail(
        "MCP get_history(2023) returns the stored winner, Houses, Awards and wiki link",
        `result=${JSON.stringify(y2023.raw)}`,
      );
    }

    for (const [id, year] of [
      [10, 2030],
      [11, 2026],
    ] as const) {
      const check = `MCP get_history(${year}) returns a clear not-found result`;
      const missing = await callTool(id, "get_history", { year });
      if (
        missing.parsed?.found === false &&
        String(missing.parsed.message).includes(
          `No past War Week found for ${year}`,
        )
      ) {
        ok(check);
      } else {
        fail(check, `result=${JSON.stringify(missing.raw)}`);
      }
    }
  } catch (error) {
    fail("MCP requests succeed", String(error));
  }
}

function startServer(port: number, env: NodeJS.ProcessEnv): ChildProcess {
  return spawn("pnpm", ["start", "-p", String(port)], {
    env,
    stdio: "inherit",
    // pnpm forks a `next start` child; detach into its own process group
    // so killing the group (not just the pnpm wrapper) stops the server.
    detached: true,
  });
}

function killProcessGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
  } catch {
    // group already gone
  }
}

function killServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed || !child.pid) {
      resolve();
      return;
    }
    const pid = child.pid;
    const forceKill = setTimeout(() => {
      killProcessGroup(pid, "SIGKILL");
    }, 3000);
    child.once("exit", () => {
      clearTimeout(forceKill);
      resolve();
    });
    killProcessGroup(pid, "SIGTERM");
  });
}

async function main() {
  if (!existsSync(path.resolve(process.cwd(), ".next"))) {
    console.error(
      "FAIL - .next build output missing: run `pnpm build` before `pnpm smoke`",
    );
    process.exit(1);
  }

  if (await portInUse(BASE_URL)) {
    console.error(
      `FAIL - something is already listening on ${BASE_URL}; stop it before running the smoke`,
    );
    process.exit(1);
  }

  if (!runStep("pnpm", ["db:migrate"], "pnpm db:migrate")) {
    process.exit(1);
  }
  // Load every seed twice: the first load resets each War Week so the counts
  // below match the seeds exactly; the second proves loading is idempotent.
  const seedFiles = readdirSync(path.resolve(process.cwd(), "seeds"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => `seeds/${f}`);
  for (const [attempt, flags] of [
    [1, ["--reset"]],
    [2, []],
  ] as const) {
    if (
      !runStep(
        "pnpm",
        ["seed:load", ...flags, ...seedFiles],
        `pnpm ${["seed:load", ...flags].join(" ")} (${seedFiles.length} seeds, load ${attempt})`,
      )
    ) {
      process.exit(1);
    }
  }
  await assertSeedLoadedOnce();
  await assertPointsEntryTargetConstraint();

  // Clear leftovers from an interrupted run, then add the smoke Organizer
  // to XI's allowlist until the run ends.
  await deleteSmokeUsers();
  await setSmokeOrganizer(true);
  const sessions = {
    organizer: await createSmokeSession(SMOKE_ORGANIZER_EMAIL),
    notOrganizer: await createSmokeSession("smoke-participant@jahnelgroup.com"),
    // Can't happen through sign-in (the user-create hook refuses it); the
    // session check still treats it as anonymous.
    outsider: await createSmokeSession("smoke-outsider@example.com"),
  };
  viewerCookie = sessions.notOrganizer.cookie;

  const server = startServer(PORT, childEnv);

  try {
    const ready = await waitForReady();
    if (!ready) {
      fail(
        "server ready",
        `did not respond on ${BASE_URL}/xi within ${READY_TIMEOUT_MS}ms`,
      );
    } else {
      ok("server ready");
      await assertRootRedirect();
      await assertXiHome();
      await assertUnknownEdition404();
      await assertLeaderboard();
      await assertSchedule();
      await assertHomeNowNext();
      await assertMoreLinks();
      await assertHistory();
      await assertArchiveDetail();
      await assertCompetitions();
      await assertCompetitionDetail();
      await assertTeams();
      await assertFreeForAllRoster();
      await assertMcp();
      await assertSignInPage();
      await assertAdminGate(sessions);
      await assertSignInRequired();
      await assertAdminLink(sessions);
      await assertAdminPointsPage(sessions);
      await assertPointsEntryActions(sessions);
      await assertHideAndReveal(sessions);
      await assertAnnouncementFeed();
      await assertAnnouncementHomePinned();
      await assertAnnouncementActions(sessions);
      await assertAnnouncementUnsafeContentStripped(sessions);
      await assertAnnouncementAdminPages(sessions);
    }
  } finally {
    await killServer(server);
    await deleteSmokeUsers().catch((error) =>
      fail("delete smoke users", String(error)),
    );
    await setSmokeOrganizer(false).catch((error) =>
      fail("remove the smoke Organizer from XI", String(error)),
    );
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
