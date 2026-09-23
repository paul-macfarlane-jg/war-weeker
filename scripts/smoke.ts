import { loadEnvConfig } from "@next/env";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 30_000;

const childEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_DRIVER: process.env.DATABASE_DRIVER,
};

let failures = 0;

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
      const res = await fetch(`${BASE_URL}/xi`);
      if (res.status === 200) return true;
    } catch {
      // server not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function portInUse(): Promise<boolean> {
  try {
    await fetch(`${BASE_URL}/`, { redirect: "manual" });
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
    const res = await fetch(`${BASE_URL}/zz`);
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
  const check = "GET / redirects to /xi";
  try {
    const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
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
    const res = await fetch(`${BASE_URL}/xi`);
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
    const res = await fetch(`${BASE_URL}/xi/leaderboard`);
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
    const res = await fetch(`${BASE_URL}/xi/schedule`);
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
    const res = await fetch(`${BASE_URL}/xi?at=${at}`);
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

async function mcpRequest(
  body: Record<string, unknown>,
  sessionId?: string,
): Promise<{
  json: Record<string, unknown> | undefined;
  sessionId: string | undefined;
}> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
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

  return { json, sessionId: res.headers.get("mcp-session-id") ?? undefined };
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

  if (await portInUse()) {
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

  const server = spawn("pnpm", ["start", "-p", String(PORT)], {
    env: childEnv,
    stdio: "inherit",
    // pnpm forks a `next start` child; detach into its own process group
    // so killing the group (not just the pnpm wrapper) stops the server.
    detached: true,
  });

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
      await assertMcp();
    }
  } finally {
    await killServer(server);
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
