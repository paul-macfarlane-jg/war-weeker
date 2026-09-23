# 05: Standings and leaderboard

**What to build:** A participant sees live standings on `/xi/leaderboard` and in a compact view on the home page. Team standings show each Team's name, color and total, under this year's Team Label, and there's an individual leaderboard too. The main leaderboard follows the War Week's mode. Standings update on their own within about 10 seconds of a change. When standings are hidden, both pages show "Standings hidden 🔒". A Claude user can call `get_leaderboard`, which returns "hidden until closing ceremonies", with no numbers, while hidden.

**Blocked by:** 03

**Status:** done

**Notes:**
- Standings is one pure function (mode, Competitions, Participants with Team memberships, Points Entries, hidden flag) that returns `hidden` or team + individual standings with the main leaderboard marked. Every page and MCP tool uses it; none does its own math. Rules are as in the spec's Standings rules section.
- Polling uses `router.refresh()` about every 10 s; no websockets.
- Touches standings hidden/reveal logic, so red-team the plan (repo policy).

- [x] Table-driven vitest tests of the Standings function cover: team-only entries; member entries with Counts Toward Team on and off; free-for-all making individual standings the main leaderboard; fractional points; tied totals sharing a rank; no entries; `hidden` hiding both leaderboards
- [x] `/xi/leaderboard` shows team and individual standings, with the main one first according to mode; fractional points display correctly
- [x] The home page shows compact main-leaderboard standings, or "Standings hidden 🔒"
- [x] With the seed un-hidden locally, changing a Points Entry in the database shows up on an open leaderboard within ~10 s without a manual refresh
- [x] MCP `get_leaderboard(kind: team | individual)` returns standings when visible and the explicit hidden result with no numbers when hidden
- [x] Smoke is extended: `/xi/leaderboard` responds, and MCP `get_leaderboard` returns the hidden result for the demo seed
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [SCOPE CHANGE] 2026-09-23

Implemented via `/implement` rather than the full Atlas route, so no red-team review of a written plan was run despite the Notes ("Touches standings hidden/reveal logic, so red-team the plan"). The hidden path is covered instead by unit tests (`computeStandings` returns `{ hidden: true }`; `toLeaderboardResult` emits no digits) and smoke (pages and MCP `get_leaderboard` for both kinds while hidden).

Decisions not spelled out in the ticket:
- The individual leaderboard lists only Participants with at least one individual Points Entry (XI has 101 Participants). Team standings list every Team, including zero totals.
- Ties are ordered by name and share a rank (1, 1, 3).
- Points are summed in hundredths (the column is `numeric(8,2)`), so 0.1 + 0.2 comes out as 0.3. Display shows up to 2 decimals.
- The home compact view shows every Team in `teams` mode, or the top 5 individuals in free-for-all mode.
- Polling skips ticks while the browser tab is hidden.
- `get_leaderboard` returns `{ warWeek: null }` when there is no current War Week.

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, base `staging`).

**Standards**
- Hard: the banned term "member" appeared in a test title (CONTEXT.md) → fixed.
- Smell: the pages and MCP each rebuilt a Team lookup for individual rows → fixed (`IndividualStanding.team` now carries name and color from `computeStandings`).
- Smell: the hidden rule was duplicated in `getStandings` → fixed (it now skips the queries and delegates to `computeStandings`).
- Smell: `AutoRefresh` had an unused `intervalMs` parameter → removed.
- Smell: the `rows()` test helper restated its type → fixed.
- Not changed:
  - The hidden / main branching is repeated across the home page and the leaderboard page. The two views differ (compact vs full); left as is.
  - The MCP no-War-Week branch lives inline in the route, as it does for `get_current_war_week`.
  - The `LeaderboardResult.standings` row union is untagged; `kind` sits beside it.
- Evidence: logs are text, not screenshots, because browser-pane screenshots can't be saved to disk from this session. The log records rendered page text and timings.

**Spec**
- No wrong Standings math found. Team, Counts Toward Team, individual, ties, fractional, main-by-mode and hidden were all checked against the spec's Standings rules.
- Polling was skipped when the War Week is `complete`, which could miss a Reveal after completion → fixed (pages always poll).
- While hidden, the home heading showed "Team standings" even in free-for-all mode → fixed (heading follows mode).
- The live-update evidence was ambiguous about whether the tab was already open → clarified below. The tab was opened before the DB change, and the change appeared via polling with no navigation.
- Admin standings view ("Organizers still see the standings in admin") is owned by the admin tickets (08/09); not in scope here.
- Removing the ac04 evidence is required by testing.md ("Clear the entire proof-artifact root … for each work package").

### [CLOSEOUT] 2026-09-23

- Repository: war-weeker, branch `feat/05-standings-and-leaderboard`, base `staging`. All work by the main session (Claude Opus 5.5), TDD at the Standings and MCP-payload seams.
- Deliverables:
  - `src/lib/standings.ts` (the pure Standings function) and `src/lib/points.ts` (display format)
  - `src/queries/standings.ts`
  - `src/mcp/leaderboard.ts` and the `get_leaderboard` tool in `src/app/api/mcp/route.ts`
  - `src/components/standings.tsx` and `src/components/auto-refresh.tsx`
  - `/[edition]/leaderboard` page, the home compact view, and smoke extensions
- DoD:
  - Table-driven Standings tests covering every listed case: PASS (`src/lib/standings.test.ts`, 9 tests).
  - `/xi/leaderboard` shows team and individual standings, main first by mode, fractional points correct: PASS (`test-results/ac05-live-update.log`: Blue 20 / Red 19.5, James Novak 1.5).
  - Home compact main leaderboard or "Standings hidden 🔒": PASS (log, both states).
  - With XI un-hidden locally, a DB Points Entry change appeared on the already-open leaderboard in ~4 s with no manual refresh: PASS (log; polling cadence every 10 s). The DB was restored afterwards with `pnpm seed:load --reset seeds/xi.json`.
  - MCP `get_leaderboard(kind)` returns standings when visible and the hidden result with no numbers when hidden: PASS (`src/mcp/leaderboard.test.ts`; log for visible; smoke for hidden).
  - Smoke extended: `/xi/leaderboard` and `/xi` show "Standings hidden", and MCP `get_leaderboard` for both kinds returns the hidden result with no digits: PASS (`test-results/ac05-gate.log`).
  - Slice gate: PASS (`pnpm gate`: typecheck, lint with 0 errors and 2 existing `<img>` warnings, 93 tests, build, 23 smoke checks; `test-results/ac05-gate.log`).
