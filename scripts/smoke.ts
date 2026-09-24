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
  const check = "GET /xi/more links to Competitions and Teams";
  try {
    const res = await signedInFetch(`${BASE_URL}/xi/more`);
    const body = await res.text();
    const checks = {
      competitions: body.includes('href="/xi/competitions"'),
      teams: body.includes('href="/xi/teams"'),
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
      await assertCompetitions();
      await assertCompetitionDetail();
      await assertTeams();
      await assertFreeForAllRoster();
      await assertMcp();
      await assertSignInPage();
      await assertAdminGate(sessions);
      await assertSignInRequired();
      await assertAdminLink(sessions);
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
