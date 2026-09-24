# 26: Setup screens: Teams, roster and Competitions

**What to build:** Organizers can create, edit and delete Teams (name, color, logo URL), Participants (display name, company tag, email, Team, Leader) and Competitions (name, description, scoring, max points, Counts Toward Team, group, Placement Points from 22) under `/admin/setup`.

**Blocked by:** 22 (Placement Points column), 25 (the `/admin/setup` shell). Branch from `staging` after both merge.

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24. Confirm at the start of `/implement`.

- The seed-vs-UI rule, validation reuse and organizer check are the same as in ticket 25.
- **Guards:** deleting a Team or Participant or Competition that has Points Entries or Award recipients is refused, and the message names the count. There's no cascading delete of scoring data. Participant email stays unique within the War Week, and duplicate emails are a field error. At most one Leader per Team, if the schema or CONTEXT says so; follow CONTEXT.md.
- The roster is a table with inline "Add Participant". Bulk CSV import is out of scope.
- It turns on the "Teams & roster" and "Competitions" links on the setup landing.

## Acceptance criteria

- [x] Server actions with unit tests for the guards and the duplicate email check.
- [x] Adding a Participant shows them on `/xi/teams` (with the Avatar from 16; see comment: 16 isn't built yet). Adding a Competition with Placement Points shows its preset buttons in points entry. Smoke covers one of each.
- [x] Screenshots at 390px and desktop under `test-results/26-setup-teams/`.
- [x] `pnpm gate` passes.

## Comments

- 2026-09-24 (Claude): Implemented on `feat/26-setup-teams-roster-competitions` with the decisions above. Leaders: CONTEXT.md lists a Team's "Leaders first", so a Team may have more than one Leader (now stated in CONTEXT.md). Guards added beyond the listed ones, in the same "no cascading delete" spirit: deleting a Team that still has Participants, or a Competition with Schedule Items, is refused. Changing a Competition's scoring while it has Points Entries is refused, and so are Teams and team-scored Competitions in a free-for-all. Team, Participant and Competition names stay unique (the schema already required that), with friendly messages. A duplicate email is refused with a message naming the field and who has it ("x is already Neo's email."). It shows under the row, since setup actions return one error. The Avatar from 16 isn't on `/xi/teams` because ticket 16 isn't built yet; the new Participant shows by name. The roster lays out as a table at desktop width and as stacked rows at 390px. The ticket 25 setup actions now share the same organizer and id-check helper, so a malformed Day id is refused instead of throwing. The smoke checks the new Competition's Placement Points in the `/admin/points` props, and `scripts/setup-teams-evidence.ts` drives the UI for the screenshots. `test-results/` holds only this ticket's evidence, per `docs/agents/testing.md`. The gate ran with `DATABASE_URL` from `.env.example` because the worktree has no `.env.local`.
