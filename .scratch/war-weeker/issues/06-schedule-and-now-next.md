# 06: Schedule and now/next

**What to build:** A participant opens `/xi/schedule` and sees the week grouped by Day with each Day Theme, opening on today. Each Schedule Item shows time (ET), title, host, location, description, category, a virtual link when present, and a link to its Competition when it's a competition. The home page shows today's Day Theme and what's on now and next. A Claude user can ask for the schedule of a given day.

**Blocked by:** 03

**Status:** done

- [x] Schedule Items are grouped by Day in time order, each Day with its Day Theme, all times in ET whatever the viewer's timezone
- [x] The page opens scrolled to today when today is within the War Week
- [x] Categories (competition / education / social / meal / work) are visually distinct; rich descriptions render through the read-only viewer
- [x] Competition Schedule Items link to `/xi/competitions/[id]`; the link target may 404 until ticket 07 lands
- [x] The home page shows today's Day Theme and now/next items computed in ET, covered by a vitest test of the now/next logic with a fixed clock
- [x] MCP `get_schedule(date?)` returns that day's items, or the full schedule when no date is given
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, base `staging`).

**Standards**
- Hard: the banned term "Tournament" was used in made-up test fixtures and in smoke check text (CONTEXT.md). Fixed: fixtures renamed, and smoke now asserts on the "Red vs. Blue" Day.
- Smell: `toEntry` and the query both copied every field just to drop `dayId`. Fixed: `groupSchedule` now takes `{ dayId, entry }`.
- Smell: `CATEGORY_STYLE` and `CATEGORY_BORDER` were two maps on the same key. Fixed: merged into one map.
- Smell: `formatTimeRange` lived in a component file. Fixed: moved to `src/lib/schedule.ts` and unit-tested.
- Smell: `toMinutes` duplicated `toSeconds`. Fixed: removed.
- Smell: the loop variable `d`. Fixed: renamed to `day`.
- Bug: items running past midnight never counted as on now. Fixed: the end wraps into the next day, and yesterday's items are checked. Tested.
- Bug: a date gap in the middle of the week showed "War Week hasn't started yet". Fixed: `beforeStart` added, and a gap now shows "Nothing scheduled today". Tested.
- Not changed: dates and times stay as strings, matching the Drizzle schema. The home `formatDateRange` formatter setup is similar but was left alone.

**Spec**
- All seven criteria were found implemented.
- `getSchedule` had no date filter ("the schedule (optionally for one date)"). Fixed: `getSchedule(warWeekId, { date })` filters in SQL.
- The gate log didn't show an exit status. Fixed: the log now ends with `gate exit status: 0`. The `ELIFECYCLE … 143` line is the smoke run stopping its own `next start`.
- Scope additions, kept on purpose:
  - `?at=<ISO instant>` clock override, so the demo can show now/next: XI ran in February and the real date is outside the week.
  - Hiding now/next after the week ends.
  - Plain-text descriptions in `get_schedule`.
- Product rules the spec doesn't set are now written in CONTEXT.md under "Schedule display rules":
  - An item with no end time is on for 60 minutes.
  - "Next" is every item sharing the earliest start time, and can fall on a later Day.
  - Times cross midnight.

### [CLOSEOUT] 2026-09-23

- Repository: war-weeker, branch `feat/06-schedule-and-now-next`, base `staging`. All work by the main session (Claude Opus 5.5). TDD at the pure schedule module (`src/lib/schedule.ts`) and the MCP payload seam (`src/mcp/schedule.ts`).
- Deliverables:
  - `src/lib/schedule.ts`: grouping, ET clock, now/next, formatting and `?at=`.
  - `src/queries/schedule.ts`
  - `src/mcp/schedule.ts` and the `get_schedule(date?)` tool in `src/app/api/mcp/route.ts`
  - `src/components/schedule-item.tsx`, `now-next.tsx` and `scroll-to-today.tsx`
  - The `/[edition]/schedule` page, the home Today / On now / Up next section, smoke extensions, and the CONTEXT.md schedule display rules.
- DoD:
  - Schedule Items are grouped by Day in time order, each Day with its Day Theme, all in ET: PASS.
    - `groupSchedule` tests.
    - Times are formatted from stored ET wall-clock strings, never from the viewer's clock, and day headings are pinned to UTC.
    - Smoke: `/xi/schedule` shows Day Themes and "7:00 AM ET".
  - The page opens scrolled to today: PASS.
    - `test-results/schedule-opens-on-today/screenshot.png` shows `?at=` Wed Feb 25 opening on "Wednesday, Feb 25 · Today".
    - Also checked in the browser pane: the day anchor sits at the top of the viewport after load.
  - Categories are visually distinct, and descriptions render through `RichText`: PASS. Each category has a colored edge, badge and icon (screenshot).
  - Competition items link to `/xi/competitions/[id]`: PASS (smoke checks the link href). The target 404s until ticket 07.
  - The home page shows today's Day Theme and now/next in ET, tested with a fixed clock: PASS.
    - `src/lib/schedule.test.ts` covers 11 table cases, plus edge cases for DST, UTC-vs-ET date rollover, crossing midnight and a mid-week gap.
    - `test-results/home-now-next/screenshot.png`.
    - Smoke: `/xi?at=` for Feb 24 at 12:30 ET.
  - MCP `get_schedule(date?)` returns that day's items, or the full schedule: PASS (`src/mcp/schedule.test.ts`; smoke checks one Day and all six).
  - Slice gate: PASS (`test-results/06-gate/gate.log`).
    - `pnpm gate`: typecheck, then lint (0 errors, the 2 existing `<img>` warnings), 125 tests, build, and 28 smoke checks.
    - Exit status 0.
- Deviations: see the scope additions above. None break an acceptance criterion.
- PR: see the PR into `staging` for this branch.
