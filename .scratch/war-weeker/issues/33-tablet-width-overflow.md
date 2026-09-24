# 33: Horizontal overflow between ~768px and ~1000px

**What to build:** Two layouts spill past the viewport at tablet / half-screen widths and make the page scroll sideways (regression round 1, ticket 29, measured at an 812px viewport on staging; both are 0px at 1280px and 0px at 375px):

1. Every `/xi/*` page: the desktop top nav (brand, theme name, Home, Schedule, Leaderboard, News, More, Admin, Sign out) overflows by 20px; "Sign out" is clipped. `/history`, `/x` and `/i` do not overflow at the same width, so it is the XI mono font plus the extra items. Evidence: `test-results/29-regression-round-1/01-nav-overflow-812-schedule.png`.
2. `/admin/setup/teams`: each roster row (Display name, Company Tag, Email, Team, Captain, Save, Delete) is a fixed grid; the page overflows by 400px and Save, Delete, Team and Captain sit off-screen. Evidence: `test-results/29-regression-round-1/02-setup-teams-overflow-812.png`.

**Blocked by:** none

**Status:** done

**Severity:** fix-tonight (a judge on a half-width window or an iPad lands on a sideways-scrolling page)

## Decisions

- Nav: keep the mobile bottom bar up to `lg` (1024px) instead of `md`, or move "Sign out" and "Admin" into "More" below `lg`. Either is fine; pick the smaller diff. Never let `html` scroll horizontally: verify with `document.documentElement.scrollWidth === clientWidth` at 768, 812, 900 and 1024.
- Roster rows: make the grid responsive (two rows below `lg`: name/tag/email on the first, team/captain/actions on the second) or let it wrap. Same check.

## Acceptance criteria

- [x] `/xi/schedule` and `/admin/setup/teams` have zero horizontal overflow at 768, 812, 900, 1024 and 1280px, and still at 375px.
- [x] Screenshots at 812px of both pages under `test-results/33-tablet-width-overflow/`.
- [x] `pnpm gate` passes.

## Comments

**[CLOSEOUT]** (2026-09-24, branch `fix/32-33-hover-and-overflow`, one PR with ticket 32)

- Delivered in the main session (Opus 5.5), no workers.
- `pnpm gate` PASS (typecheck, lint, 498 tests, build, smoke 139 ok).
- Evidence: `pnpm tsx scripts/fix-32-33-evidence.ts` against a local build and seeded Postgres.
- Nav: bottom tab bar kept up to `lg` (`primary-nav.tsx`, `[edition]/layout.tsx` padding); Admin and Sign out stay reachable from More below `lg`.
- Setup teams: roster rows are three columns (two rows) from `sm` and one row from `xl` with `minmax(0,…)` columns; the Team row's name label got `min-w-0` (its input was the remaining overflow once the roster was fixed).
- Overflow (`scrollWidth - clientWidth`) is 0px for `/xi/schedule` and `/admin/setup/teams` at 375, 768, 812, 900, 1024 and 1280. Screenshots: `test-results/33-tablet-width-overflow/01-xi-schedule-812.png`, `02-setup-teams-812.png`. PASS.
- Deviation: the roster's single-row layout starts at `xl`, not `lg`, since the admin sidebar leaves only ~736px of content at 1024.

**[AI CODE REVIEW]** (2026-09-24, `/code-review` since `staging`, two axes)

- Standards: one hard finding, `docs/agents/testing.md` requires clearing `test-results/` per work package; fixed by removing ticket 29's evidence (still at `73a8588`). Judgement call: `scripts/fix-32-33-evidence.ts` duplicates the CDP harness of `scripts/regression-29-evidence.ts`; kept, matching the per-ticket evidence-script pattern.
- Spec: no missing requirements, no scope creep, nothing wrong; only the Status/AC boxes were still open, closed in this commit.
