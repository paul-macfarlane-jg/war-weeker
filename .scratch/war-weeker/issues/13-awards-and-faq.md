# 13: Awards and FAQ

**What to build:** A participant sees the War Week's Awards and their recipients (Participants and/or a Team) on `/xi/awards`, and the FAQ on `/xi/faq`, both reachable from the More tab. An Organizer can create, edit and delete Awards in admin. FAQ Items come from the seed only. A Claude user can ask for Awards and the FAQ.

**Blocked by:** 08

**Status:** done

- [x] `/xi/awards` lists Awards with name, description and recipients; Awards don't affect Standings
- [x] Organizer-only server actions create, edit and delete Awards with Participant and/or one Team recipients
- [x] `/xi/faq` lists FAQ Items in sort order, with rich answers through the read-only viewer
- [x] MCP `get_awards` and `get_faq` return the same data
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [EXECUTION PLAN] 2026-09-24

Owner: Claude Opus 5.5, direct checkout on `feat/13-awards-and-faq` off `staging` 66565c3, done in one pass with no workers because it follows the ticket 12 pattern. No schema change was needed (`award`, `award_participant` and `faq_item` already exist).

- **Lib** (`src/lib/awards.ts`, vitest first):
  - `awardInputSchema` / `parseAwardInput`. Name 1–120; description ≤1000, with blank stored as null; Team a uuid or null; Participants unique uuids; at least one recipient.
  - `isAwardId`, `AwardView` and `namedAward`.
- **Queries:**
  - `getAwards` (by name, with Team and Participants), `getAwardForEdit`, `getAwardFormOptions`, `recipientsInWarWeek` and `getAwardWarWeek`.
  - `getFaqItems` (sort order, then id).
  - The Archive now reads Awards through `getAwards`.
- **Mutations:** create, update (replaces the Participants) and delete, each in a transaction scoped to `ctx.warWeekId`. Any recipient from another War Week is refused. DB tests run in a rolled-back transaction.
- **Actions** (`src/actions/awards.ts`): `requireOrganizer` runs first. Create writes to the current War Week; edit and delete use the Award's own War Week. Each action revalidates `/admin`, `/<edition>` and `/history`.
- **Pages:**
  - `/[edition]/awards`, and `/[edition]/faq` (a `<details>` accordion rendering answers with `RichText`).
  - More tab links, and the More tab highlighted on these pages.
  - `/admin/awards` with its list, New and Edit pages. `AwardForm` has a Team select and a searchable Participant checklist.
  - The admin nav and overview link to Awards.
- **MCP:** `get_awards` and `get_faq`, with vitest serializers.

| Criterion | Proof |
|---|---|
| AC1 Awards page | smoke `/xi/awards` shows the seeded names, recipients, description and the no-Standings note; `desktop-awards.png` and `phone-awards.png` |
| AC2 Organizer actions | lib and mutation vitests; smoke checks that a non-Organizer is refused create, update and delete, that no recipients and another War Week's Participant are refused, and that create (Team plus 2 Participants) → edit → delete works and adds no Points Entries; the admin pages are smoked too; `desktop-admin-awards.png` and `desktop-admin-new-award.png` |
| AC3 FAQ | smoke `/xi/faq` shows the six questions in seed order with an answer's text; `phone-faq.png` |
| AC4 MCP | vitests for `toAwardsResult` and `toFaqResult`; smoke checks that `tools/list` has both and that `get_awards` / `get_faq` match the seed |
| Gate | `pnpm gate`, logged in `gate.txt` |

### [AI CODE REVIEW] 2026-09-24

Two-axis `/code-review` of `git diff staging...HEAD` by two fresh agents. Nothing blocking on either axis.

**Spec**
- All four ACs are met, with no scope creep.
- The first `gate.txt` didn't record an exit code. **Fixed**: the gate was re-run and its exit code appended.
- The ticket wasn't closed yet. **Fixed** in this commit.
- The MCP tools cover the current War Week only, like the other MCP tools. Answers come back as plain text, and ids and Team colour are left out. Accepted.

**Standards**
- No hard violations.
- The recipients check ran outside the write transaction. **Fixed**: it now runs inside it.
- The "Award to names" mapping was written in both `archive.ts` and `mcp/awards.ts`. **Fixed**: both use `namedAward` in `src/lib/awards.ts`, per ADR 0001.
- The form had its own `Initial` type. **Fixed**: it uses `AwardInput`.
- Kept, because they follow the ticket 12 precedent and are better cleaned up across all areas at once:
  - `organizerContext` and `revalidateWarWeek` are copied across the three action files.
  - `isAwardId` duplicates `isAnnouncementId`.
  - The delete buttons are near-duplicates.
  - `fieldClass` is duplicated.
- Also kept:
  - `dbOrTx.transaction` is used instead of `withTransaction` so it works with `DBOrTx`, which is ADR 0001's intent.
  - `getAwardForEdit` filters the War Week's handful of Awards in memory.
  - The Team FK is `set null`, so deleting a Team (seed-only) can leave a Team-only Award with no recipients. Editing it then asks for a new recipient.

### [CLOSEOUT] 2026-09-24

- **Repository:** `war-weeker`, branch `feat/13-awards-and-faq`, PR into `staging` (the URL is in the PR). Base 66565c3.
- **Deliverables:** Claude Opus 5.5 did the implementation inline. The review agents were general-purpose.
- **DoD** (evidence in `test-results/13-awards-and-faq/`):
  - AC1 `/xi/awards` shows name, description and recipients, and Awards don't affect Standings: **PASS**.
  - AC2 Organizer-only create, edit and delete with Participant and/or Team recipients: **PASS**.
  - AC3 `/xi/faq` in sort order, with answers rendered read-only: **PASS**.
  - AC4 MCP `get_awards` and `get_faq` return the same data: **PASS**.
  - Slice gate: **PASS**. `pnpm gate` exited 0: typecheck, lint (0 errors), 308 tests, the build and 111 smoke checks with 0 failures (`gate.txt`, ending `GATE EXIT 0`). The `ELIFECYCLE 143` line in it is the smoke stopping its own server.
- **Deviations:**
  - No schema change.
  - Ticket 12's proof root `test-results/12-announcements/` was cleared, following precedent.
  - The branch also carries f97c483, the ticket 15 placeholder, which was committed from another session.
- **Run:** `docker compose up -d && pnpm gate`, then `pnpm tsx scripts/awards-evidence.ts` for the screenshots (needs Google Chrome).
