# 07: Competitions and Teams pages

**What to build:** A participant can browse the War Week's Competitions, grouped by Competition Group, each with max points and scoring type. They can open one to see the Points Entries behind it. They can view Team rosters with Leaders shown under this year's Leader Title and each Participant's Company Tag. In a free-for-all War Week, the roster lists all Participants with no Teams.

**Blocked by:** 03

**Status:** done

- [x] The Competitions list, reachable from the More tab, groups Competitions by Competition Group, with ungrouped ones listed separately, and shows max points and team/individual scoring
- [x] `/xi/competitions/[id]` shows the description and its Points Entries (target, points, note); unknown ids return 404
- [x] Competition Points Entries stay visible while standings are hidden only if that doesn't reveal totals. Decide in planning, defaulting to hiding them while hidden, and record the decision
- [x] `/xi/teams` shows each Team (name, color, logo) under the Team Label, with Leaders marked by Leader Title and Company Tags shown
- [x] A free-for-all War Week shows one roster of all Participants
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [EXECUTION PLAN] 2026-09-23

- Hidden-standings decision (asked for by the ticket): while standings are hidden, a Competition page shows its description, max points and scoring, but not its Points Entries ("Points hidden 🔒"). The entries would let anyone add up the hidden totals. The query skips the Points Entries fetch entirely while hidden, the same way `getStandings` does. Recorded in CONTEXT.md under "Competition and roster display rules", with the list, ledger and roster ordering rules.
- Layering follows ADR 0001. Pure lib (`src/lib/competitions.ts`, `src/lib/roster.ts`, TDD first), then thin queries (`src/queries/competitions.ts`, `src/queries/roster.ts`), then pages.

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, base `staging`).

**Standards**
- Hard: the banned term "Member" appeared in an identifier (`members` in `groupCompetitions`). Fixed: renamed to `inGroup`.
- Borderline: "Team Night Events" appeared in lib test fixtures. Fixed: the fixtures now use made-up group names. Smoke keeps the real seed group name because it has to match the seed.
- Smell: the plural Team Label and the "Participants" choice were built in both pages. Fixed: `rosterHeading(mode, teamLabel)` in `src/lib/roster.ts`, with a test.
- Smell: components imported `CompetitionListItem` from the query layer. Fixed: the type now lives in `src/lib/competitions.ts`, and the query's column map `satisfies` it.
- Smell: `getCompetitions` took a raw id. Fixed: it takes `Pick<WarWeek, "id">` like the other queries.
- Smell: the name+color pair was null-checked twice. Fixed: `toLedgerTeam`.
- Safety: `team!` became an explicit fallback. The database's exactly-one-target constraint already guarantees a target.

**Spec**
- All six criteria implemented; no missing requirements.
- Scope additions, kept on purpose:
  - `AutoRefresh` on the Competition page, so entries appear after a Reveal.
  - A "Not on a <Team Label> yet" section for teams-mode Participants with no Team.
  - A count of Participants per Team.
  - The More tab stays highlighted on its subpages.
- Noted, not changed:
  - Pluralising adds "s", which is right for House, Tribe and Team.
  - Smoke briefly un-hides XI to check the visible ledger, then re-hides it in `finally`. The next smoke run resets the seeds anyway.

### [CLOSEOUT] 2026-09-23

- Repository: war-weeker, branch `feat/07-competitions-and-teams-pages`, base `staging`. All work by the main session (Claude Opus 5.5). TDD at the lib seam (`src/lib/competitions.ts`, `src/lib/roster.ts`).
- Deliverables:
  - `src/lib/competitions.ts` and `src/lib/roster.ts`, with tests.
  - `src/queries/competitions.ts` and `src/queries/roster.ts`.
  - `src/components/competitions.tsx` and `src/components/roster.tsx`.
  - Pages: `/[edition]/competitions`, `/[edition]/competitions/[id]`, `/[edition]/teams`, and the More page links.
  - The More tab is highlighted on its subpages.
  - Smoke extensions and CONTEXT.md display rules.
- DoD:
  - Competitions list, reachable from More, grouped with ungrouped listed separately, showing max points and scoring: PASS.
    - `groupCompetitions`, `describeScoring` and `formatMaxPoints` tests.
    - Smoke: `/xi/more` links, and `/xi/competitions` shows "Team Night Events", "Other Competitions", "Max 1.5 pts" and "Individual · counts toward Team".
    - `test-results/more-links/`, `test-results/competitions-list/`.
  - `/xi/competitions/[id]` shows the description and Points Entries (target, points, note), and unknown ids 404: PASS.
    - `buildCompetitionLedger` and `isCompetitionId` tests.
    - Smoke: revealed XI shows "Dani Milliken" and the note; a random UUID and `not-a-uuid` both return 404.
    - `test-results/competition-points-entries/`.
  - Points Entries while hidden, decided and recorded: PASS.
    - Hidden by default (see the execution plan).
    - Smoke: hidden XI shows "Points hidden" and neither the entry's target nor its note.
    - `test-results/competition-points-hidden/`.
  - `/xi/teams` shows each Team (name, color, logo) under the Team Label, with Leaders marked by Leader Title and Company Tags: PASS.
    - `buildRoster` tests.
    - Smoke: Red, Blue, "Captain", a Leader's name and "LTI".
    - `test-results/teams-roster/`.
  - A free-for-all War Week shows one roster of all Participants: PASS.
    - `buildRoster` free-for-all test.
    - Smoke: `/iv/teams`.
    - `test-results/free-for-all-roster/`.
  - Slice gate: PASS (`test-results/07-gate/gate.log`, `gate exit status: 0`).
- Screenshots were taken with headless Chrome at 500px wide, the headless minimum, against `pnpm start`.
- Deviations: the scope additions above. None break an acceptance criterion.
- PR: see the PR into `staging` for this branch.
