# 07: Competitions and Teams pages

**What to build:** A participant can browse the War Week's Competitions, grouped by Competition Group, each with max points and scoring type. They can open one to see the Points Entries behind it. They can view Team rosters with Leaders shown under this year's Leader Title and each Participant's Company Tag. In a free-for-all War Week, the roster lists all Participants with no Teams.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] The Competitions list, reachable from the More tab, groups Competitions by Competition Group, with ungrouped ones listed separately, and shows max points and team/individual scoring
- [ ] `/xi/competitions/[id]` shows the description and its Points Entries (target, points, note); unknown ids return 404
- [ ] Competition Points Entries stay visible while standings are hidden only if that doesn't reveal totals. Decide in planning, defaulting to hiding them while hidden, and record the decision
- [ ] `/xi/teams` shows each Team (name, color, logo) under the Team Label, with Leaders marked by Leader Title and Company Tags shown
- [ ] A free-for-all War Week shows one roster of all Participants
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
