# 04: History extraction and demo seed

**What to build:** Ten years of War Week history, plus War Week XI's real schedule, Teams, roster and Competitions, exist as committed, editable seed JSON produced from the old wiki pages. The XI demo seed is ready for the demo: live, mid-week, close race, standings hidden.

**Blocked by:** 03

**Status:** done

**Notes:**
- The extraction script is run by hand at dev time. It sends each `old-wikis/<year>.txt` to Claude through the Vercel AI Gateway (AI SDK, model `anthropic/claude-sonnet-5`, structured output against the shared seed schemas) and writes one seed file per year. It uses `AI_GATEWAY_API_KEY` and is never called at runtime.
- Historical content comes only from `old-wikis/` (Competiscore data is gone). Past years may have no Points Entries; winner and highlights are stored text.
- Don't include real employee personal data beyond what's already on the public JG wiki. Participant emails may be omitted.

- [x] The script produces seed JSON for 2016–2026, and every file passes the seed schema (checked by the vitest test from 03)
- [x] Output is hand-reviewed and committed; the app never calls Claude at runtime
- [x] 2016–2025 are `complete`, each with edition, year, dates, Story Theme, Teams and colors, winner, Awards, highlights, wiki URL and an Appearance Theme. 2016–2018 may be sparse
- [x] XI (2026, The Matrix, Red vs. Blue) is `live`, with real Days, Schedule Items, Teams, roster and Competitions from the wiki, and a green-on-black Matrix Appearance Theme
- [x] The XI demo data has fictional mid-week Points Entries with a close race, including at least one fractional value and one Counts-Toward-Team-off entry. It also has a few Announcements (one pinned, one with a video URL), a few Awards, `standingsHidden` on, and the organizer allowlist
- [x] One documented command loads all seeds into local Postgres
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [SCOPE CHANGE] 2026-09-23

The AI Gateway returned 403 for `anthropic/claude-sonnet-5` ("Free tier users do not have access to this model"). At the user's direction the extraction script was dropped: Claude Code read each `old-wikis/<year>.txt` and wrote `seeds/<edition>.json` directly, validated by the same seed schema. The `ai` dependency, the script and `AI_GATEWAY_API_KEY` were removed; spec §History extraction and story 74 updated. Criterion 1 ("the script produces…") is met by the committed, schema-validated seeds rather than a script.

Also added (not in the ticket): `seed:load --reset` (deletes each seeded War Week first, so the demo matches the seed exactly; smoke uses it), multi-file `seed:load` validating all files before loading, and a Seed workflow reset option that requires typing the environment name. CONTEXT.md records the reset exception.

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, parallel Standards and Spec agents) of the staged diff against `staging`.

**Standards**
- Hard: CONTEXT.md contradicted `--reset` → fixed (Reset exception section).
- Hard: testing.md e2e row stale → fixed.
- Risk: Seed workflow reset could wipe production with one checkbox → fixed (requires `confirm_reset` = environment name).
- Bug: unreadable/invalid-JSON file threw an unlabelled stack trace; comment overstated atomicity → fixed (per-file errors, comment and README state one transaction per War Week).
- Smoke now resets local War Weeks each run → documented in README and testing.md.
- Smells: `seed!` assertion → removed; seed file naming unchecked → test added (`<edition>.json`); `seed:all` script ordering → moved. Not changed: `loadWarWeekSeed(seed, undefined, { reset })` signature (keeps existing callers), seed file list computed in four places (glob / ls / readdirSync; acceptable).

**Spec**
- No blocking gaps. XI roster (101, 8 captains, 23 company tags), days, schedule times, 21 wiki Competitions and max points verified against the wiki; 2022/2023/2024 winners verified.
- 2019 bake-off highlight contradicted its Awards (the wiki itself disagrees) → highlight now follows the Awards list.
- Claimed XI has no Competition Groups → false (9 Team Night Events grouped).
- Needs human review (not changed): 2019–2021 have no Teams (wiki names none); 2016–2018, 2020, 2021 Story Themes are "War Week <year>" and 2019 "Star Wars" is inferred; 2021 and 2025 have no winner or Awards (wiki pages are pre-week); XI meal times, 19:00 evening activities and Tournament Night 22:00 end are assumed; "Winning the Day Challenge" is on the wiki schedule but not its scoring table and is used as the demo's Counts-Toward-Team-off Competition.

### [CLOSEOUT] 2026-09-23

- Repository: war-weeker, branch `feat/04-history-extraction-and-demo-seed`, base `staging`.
- Deliverables: `seeds/i.json`…`seeds/x.json` (2016–2025), `seeds/xi.json` rebuilt from the 2026 wiki with demo data; `src/seed/seeds.test.ts`; `--reset` and multi-file `seed:load`; `pnpm seed:all`; Seed workflow reset. 2016–2020 and XI by the main session (Claude Opus 5.5); 2021–2025 by five parallel extraction subagents, hand-reviewed.
- DoD:
  - Seeds 2016–2026 pass the seed schema: PASS (`src/seed/schema.test.ts`, 11 files).
  - Committed; app never calls Claude: PASS (no AI dependency remains).
  - 2016–2025 `complete` with required fields: PASS with known sparseness above (`seeds.test.ts`).
  - XI live, real schedule/Teams/roster/Competitions, Matrix theme: PASS (`seeds.test.ts`, spec review spot-check).
  - XI demo data (close race Red 19.5 vs Blue 20, 1.5-point entry, Counts-Toward-Team-off entry, pinned Announcement, video, 3 Awards, standings hidden, allowlist): PASS (`seeds.test.ts`).
  - One documented command: PASS (`pnpm seed:all`, README; `test-results/ac04-seed-all.log`).
  - Slice gate: PASS (`pnpm gate`, 75 tests, smoke all ok; `test-results/ac04-gate.log`).
- Follow-ups for the human:
  - `wikiUrl` values follow the unverified pattern `https://sites.google.com/jahnelgroup.com/jahnel-group-wiki/war-week-<year>`.
  - Past years' `slackChannelUrl` is the workspace root.
  - Staging and production still hold the old XI data. Old keyed Awards (`mvp`, `spirit`) will survive a plain reload, so run the Seed workflow with reset (`confirm_reset` = environment) once after this merges.
