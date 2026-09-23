# 05: Standings and leaderboard

**What to build:** A participant sees live standings on `/xi/leaderboard` and in a compact view on the home page. Team standings show each Team's name, color and total, under this year's Team Label, and there's an individual leaderboard too. The main leaderboard follows the War Week's mode. Standings update on their own within about 10 seconds of a change. When standings are hidden, both pages show "Standings hidden 🔒". A Claude user can call `get_leaderboard`, which returns "hidden until closing ceremonies", with no numbers, while hidden.

**Blocked by:** 03

**Status:** in-progress

**Notes:**
- Standings is one pure function (mode, Competitions, Participants with Team memberships, Points Entries, hidden flag) that returns `hidden` or team + individual standings with the main leaderboard marked. Every page and MCP tool uses it; none does its own math. Rules are as in the spec's Standings rules section.
- Polling uses `router.refresh()` about every 10 s; no websockets.
- Touches standings hidden/reveal logic, so red-team the plan (repo policy).

- [ ] Table-driven vitest tests of the Standings function cover: team-only entries; member entries with Counts Toward Team on and off; free-for-all making individual standings the main leaderboard; fractional points; tied totals sharing a rank; no entries; `hidden` hiding both leaderboards
- [ ] `/xi/leaderboard` shows team and individual standings, with the main one first according to mode; fractional points display correctly
- [ ] The home page shows compact main-leaderboard standings, or "Standings hidden 🔒"
- [ ] With the seed un-hidden locally, changing a Points Entry in the database shows up on an open leaderboard within ~10 s without a manual refresh
- [ ] MCP `get_leaderboard(kind: team | individual)` returns standings when visible and the explicit hidden result with no numbers when hidden
- [ ] Smoke is extended: `/xi/leaderboard` responds, and MCP `get_leaderboard` returns the hidden result for the demo seed
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
