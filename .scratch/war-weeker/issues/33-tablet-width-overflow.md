# 33: Horizontal overflow between ~768px and ~1000px

**What to build:** Two layouts spill past the viewport at tablet / half-screen widths and make the page scroll sideways (regression round 1, ticket 29, measured at an 812px viewport on staging; both are 0px at 1280px and 0px at 375px):

1. Every `/xi/*` page: the desktop top nav (brand, theme name, Home, Schedule, Leaderboard, News, More, Admin, Sign out) overflows by 20px; "Sign out" is clipped. `/history`, `/x` and `/i` do not overflow at the same width, so it is the XI mono font plus the extra items. Evidence: `test-results/29-regression-round-1/01-nav-overflow-812-schedule.png`.
2. `/admin/setup/teams`: each roster row (Display name, Company Tag, Email, Team, Captain, Save, Delete) is a fixed grid; the page overflows by 400px and Save, Delete, Team and Captain sit off-screen. Evidence: `test-results/29-regression-round-1/02-setup-teams-overflow-812.png`.

**Blocked by:** none

**Status:** ready-for-agent

**Severity:** fix-tonight (a judge on a half-width window or an iPad lands on a sideways-scrolling page)

## Decisions

- Nav: keep the mobile bottom bar up to `lg` (1024px) instead of `md`, or move "Sign out" and "Admin" into "More" below `lg`. Either is fine; pick the smaller diff. Never let `html` scroll horizontally: verify with `document.documentElement.scrollWidth === clientWidth` at 768, 812, 900 and 1024.
- Roster rows: make the grid responsive (two rows below `lg`: name/tag/email on the first, team/captain/actions on the second) or let it wrap. Same check.

## Acceptance criteria

- [ ] `/xi/schedule` and `/admin/setup/teams` have zero horizontal overflow at 768, 812, 900, 1024 and 1280px, and still at 375px.
- [ ] Screenshots at 812px of both pages under `test-results/33-tablet-width-overflow/`.
- [ ] `pnpm gate` passes.

## Comments
