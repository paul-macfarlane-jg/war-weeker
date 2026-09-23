# 10: Hide and Reveal

**What to build:** An Organizer can hide the standings, then press Reveal at closing ceremonies. Every open home and leaderboard page, on the projector and on phones, notices the change on its next poll and plays the Reveal animation, with standings counting up in reverse rank order. MCP `get_leaderboard` returns real standings after the Reveal.

**Blocked by:** 05, 08

**Status:** ready-for-agent

**Notes:** Touches standings hidden/reveal logic, so red-team the plan (repo policy). MCP must return the hidden result whenever `standingsHidden` is on.

- [ ] Admin has Hide and Reveal controls; the server actions check the organizer allowlist
- [ ] A client that saw hidden standings and then gets revealed ones on a poll plays the Reveal animation once, in reverse rank order, counting totals up; a client that first loads after the Reveal just shows standings
- [ ] Two open browsers animate within one poll interval of each other after the Reveal (screenshot evidence of before and after under `test-results`)
- [ ] Hiding again returns every public page and MCP `get_leaderboard` to the hidden state
- [ ] Smoke still checks that MCP `get_leaderboard` is hidden for the demo seed
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
