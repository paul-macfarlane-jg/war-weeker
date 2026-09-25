# Admin polish — execution record

Contract: `spec.md` (stable). This file is the Atlas-managed execution record.

## Execution structure

Six independent deliverables, one branch + worktree + PR each into `staging`,
run in parallel (no dependency edges). Base: `54aaae5` (staging).

| ID | Branch | Worktree (`.claude/worktrees/admin-polish/war-weeker/`) | Stories | Model | Red-team |
|---|---|---|---|---|---|
| D1 | `fix/about-copy` | `about-copy` | 1–4 | sonnet | no |
| D2 | `fix/admin-wording` | `admin-wording` | 5–6 | sonnet | no |
| D3 | `feat/admin-guide` | `admin-guide` | 12 | sonnet | no |
| D4 | `feat/structured-inputs` | `structured-inputs` | 8–11 | opus | no |
| D5 | `feat/other-category` | `other-category` | 7 | sonnet | yes (Drizzle enum) |
| D6 | `feat/privacy-terms` | `privacy-terms` | 13–15 | sonnet | yes (access change) |

Isolation: each worktree gets its own Postgres database
`war_weeker_ap_<slug>` (migrated from `.env.example`'s URL with the DB name
swapped) so parallel gates cannot wipe each other's smoke users. `pnpm smoke`
still binds port 3100, so smoke runs under a scratchpad `mkdir` lock.
Evidence scripts use ports 3311–3316 / CDP 9311–9316 and non-`smoke-` emails.

The spec `status: done` flip and this record's closeout land in D6's final
commit (the last PR), so the six PRs never conflict on `.scratch/`.
`test-results/` is cleared (stale `32-…`, `33-…` dirs removed) in D1 only.

## Deliverables

- **D1 About copy** — `src/app/about/page.tsx`, `src/app/about/page.test.tsx`
  (`src/lib/about.ts` only if it repeats copy). Eyebrow, Competiscore card,
  install sentence, "Why we built this" + "Jahnel Group" byline. Static page.
- **D2 Admin wording** — `src/components/admin-shell.tsx` ("Back to War Week
  <EDITION>"), `src/app/admin/page.tsx`, `src/app/admin/standings/page.tsx`,
  `src/app/admin/points/page.tsx`, `src/components/standings-visibility-controls.tsx`
  ("visible to Participants" / "hidden from Participants"); JSDoc comments in
  `src/queries/standings.ts`, `src/mutations/war-weeks.ts` for consistency.
  Unit test that `AdminShell` renders "Back to War Week XI" and no "public site".
- **D3 Organizer guide** — `src/app/admin/guide/page.tsx` under `loadAdminPage`,
  nav entry in `admin-shell.tsx`, every story-12 section, CONTEXT.md vocabulary.
  Unit test on rendered headings; smoke check (organizer 200 / non-organizer
  "Organizers only"); screenshot.
- **D4 Structured inputs** — shadcn CLI adds `input`, `badge`, `combobox`
  (+deps). Group combobox (`competitions-editor.tsx`, suggestions from
  `queries/setup.ts` distinct groups in the current War Week), Company Tag
  combobox (`teams-editor.tsx` roster form, distinct tags across all War
  Weeks), Organizer email chips (`war-week-settings-form.tsx`; helper in
  `src/lib/organizer-emails.ts`), Placement Points rows (`competitions-editor.tsx`;
  helper in `src/lib/placement-rows.ts`). Same submit shapes; server rules
  unchanged. Unit tests on helpers; evidence script with 375px screenshots.
- **D5 `other` category** — `src/db/schema.ts` enum, `drizzle/0004_*.sql` via
  `pnpm db:generate`, `src/seed/schema.ts`, `schedule-item-form.tsx` option,
  `schedule-item.tsx` neutral style, CONTEXT.md Schedule display rules; seed
  schema unit test; screenshot of an `other` item on `/xi/schedule`.
- **D6 Privacy + terms** — `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`
  (static, no DB/session), `PUBLIC_PATHS` in `src/lib/access.ts`,
  `access.test.ts`, links on sign-in/about/footer, CONTEXT.md access rules,
  smoke anonymous 200 checks + `/privacy/x`, `/termsx` redirect; screenshots.

## Verification map

| Criterion | Command / action | Surface | Evidence | Earliest | Invalidated by |
|---|---|---|---|---|---|
| AC-about | `pnpm test src/app/about` + `test-results/about-copy/` screenshot | local | committed | D1 | about page changes |
| AC-admin-wording | `pnpm test src/components/admin-shell` + `grep -rn "public site" src/app/admin src/components` = none | local | test output | D2 | admin copy changes |
| AC-other | `pnpm test src/seed`, migration applied by smoke, `test-results/other-category/` | local | committed | D5 | schema/seed changes |
| AC-comboboxes | `test-results/structured-inputs/group-375.png`, `tag-375.png` | local | committed | D4 | form changes |
| AC-chips | `pnpm test src/lib/organizer-emails` + screenshot + round-trip in evidence script | local | committed | D4 | form/helper changes |
| AC-placement-rows | `pnpm test src/lib/placement-rows` + screenshot + round-trip | local | committed | D4 | form/helper changes |
| AC-guide | smoke checks + `test-results/admin-guide/` | local | committed | D3 | guide changes |
| AC-public-paths | smoke anonymous 200 on /privacy, /terms; redirect on /privacy/x, /termsx; `pnpm test src/lib/access` | local | smoke output | D6 | access.ts changes |
| AC-privacy-data | red-team review vs `src/db/schema.ts` | review | execution.md | before D6 dispatch | schema changes |
| AC-links | `test-results/privacy-terms/*-375.png` | local | committed | D6 | footer/sign-in/about changes |
| AC-oauth-consent | **Human gate (Paul), after production deploy** — announced for later | production | Paul's confirmation + sign-in check | after merge+deploy | n/a |
| AC-overflow | overflow sweep at 375/768/1280 in each evidence script | local | committed log | per deliverable | any admin page change |
| AC-screenshots | `git ls-files test-results` | local | committed | per deliverable | — |
| DoD-gate | `pnpm gate` per branch | local | command output | per deliverable | any change |

## Progress

- 2026-09-24 21:30 ET: state initialized; six worktrees and private DBs created.
- 21:40: D1–D4 dispatched; red-team for D5 and D6 run first (no blocking findings; fixes folded into their packets).
- 22:00–22:10: D1, D2, D3, D5 and D6 accepted; review fixes applied by the orchestrator.
- D4: combobox popups rendered unthemed (portal to `<body>`). Paul chose to copy `theme-root.tsx`, `ui/combobox.tsx` and the `AdminShell` ThemeRoot wrap byte-identically from `feat/custom-inputs-phase-a`, so the two branches merge cleanly. A second worker applied the review fixes; the orchestrator finished its interrupted run.

## Scope changes and deviations

- **Privacy copy:** the spec's "optional Slack posts" was dropped because the code never posts to Slack. Added the Organizer email list, and the Announcement author email that signed-in users can see (red-team findings; spec rule "build the copy only from what the code stores").
- **About:** Competiscore is named once, in the card title; the body is reworded.
- **Story 15:** covered by the Privacy and Terms links in `SiteFooter`, which already renders on `/sign-in` and `/about`.
- **D4:** added a server-side `@jahnelgroup.com` check in `parseWarWeekSettingsInput`. The spec names the server as the source of truth for the email domain, but it only checked `z.email()`.
- **D4:** the free-text combobox is a `SuggestionCombobox` wrapper over shadcn Combobox, because Base UI's Combobox doesn't keep free text by default.
- **Isolation re-check:** the predicted "no overlap" was wrong for `scripts/smoke.ts`. D2 and D3 both inserted after `assertAdminGate`, and `git merge-tree` reported a conflict, so D3's check was moved after `assertAdminLink`. Every pair of branches (and D4 + `feat/custom-inputs-phase-a`) now merges cleanly.

## AI code review

Two axes per branch (fresh reviewers), adjudicated by the orchestrator.
- **Blocking:** Prettier failures in the D5 and D6 evidence scripts. Resolved.
- **Resolved non-blocking:**
  - stale About doc comment
  - D2 smoke check now covers all three admin pages; evidence setup moved inside `try`
  - D3 nav-link assertion, redundant test loop and duplicate wrapper
  - D5 test split and descriptive migration name
  - D6 analytics assertion and heading check
  - D4: re-render loop guard, blank-row error, paste splice, clearing the error, a11y labels, case-insensitive removal, `MAX_PLACES` alias, comment wording, server domain rule
- **Rejected:** restoring the tickets 32/33 evidence (`docs/agents/testing.md` requires clearing the proof root per work package).
- **Deferred (non-blocking):**
  - Organizer-guide label magic string and plurals
  - seed zod enum derived from the pgEnum
  - shared privacy/terms page shell
  - regex constants shared with `src/lib/setup.ts`
  - more D4 UI coverage in the evidence script

## Closeout

| ID | Branch | PR | Worker / model | Gate |
|---|---|---|---|---|
| D1 | `fix/about-copy` | #54 | atlas-worker / sonnet | pass (498 tests; smoke 139 ok, 0 FAIL) |
| D2 | `fix/admin-wording` | #55 | atlas-worker / sonnet | pass (499; 142 ok) |
| D3 | `feat/admin-guide` | #56 | atlas-worker / sonnet | pass (502; 141 ok) |
| D4 | `feat/structured-inputs` | #58 | atlas-worker / opus, fixes sonnet + orchestrator | pass (523; 139 ok) |
| D5 | `feat/other-category` | #57 | atlas-worker / sonnet; red-team opus | pass (500; 139 ok) |
| D6 | `feat/privacy-terms` | this PR | atlas-worker / sonnet; red-team opus | pass (517; 143 ok) |

Verified run command: `pnpm gate`, per branch, against a private local Postgres DB (`war_weeker_ap_<slug>`).

| Criterion | Verdict | Evidence |
|---|---|---|
| AC-about | PASS | `page.test.tsx`; `test-results/about-copy/` (#54) |
| AC-admin-wording | PASS | `admin-shell.test.tsx`; smoke on `/admin`, `/admin/standings` and `/admin/points`; `test-results/admin-wording/` (#55) |
| AC-other | PASS | seed and form-parse tests; migration applied by smoke; `test-results/other-category/` (#57) |
| AC-comboboxes | PASS | `test-results/structured-inputs/group-375.png`, `tag-375.png`, `log.txt` |
| AC-chips | PASS | `organizer-emails.test.ts`, `setup.test.ts`; `chips-375.png`; round-trip in `log.txt` |
| AC-placement-rows | PASS | `placement-rows.test.ts`; `placement-375.png`; round-trip `[5,3,1]` in `log.txt` |
| AC-guide | PASS | smoke for Organizer (with nav link) and non-Organizer; `test-results/admin-guide/` (#56) |
| AC-public-paths | PASS | smoke: anonymous 200 on `/privacy` and `/terms`, 307 on `/privacy/x` and `/termsx`; `access.test.ts`; existing anonymous-redirect smoke |
| AC-privacy-data | PASS | red-team inventory against `src/db/schema.ts`; axis-1 review confirmed the copy |
| AC-links | PASS | `test-results/privacy-terms/sign-in-375.png`, `about-footer-375.png`; `site-footer.test.tsx` |
| AC-oauth-consent | BLOCKED (human gate, pending) | Paul: after merge and production deploy, set the consent-screen logo to `public/icons/icon-512.png`, the home page to `https://war-weeker.vercel.app/about`, and the privacy and terms URLs; keep the user type Internal. Post-check: sign in at production and see the logo and name. |
| AC-overflow | PASS | `overflow.txt` in each `test-results/<name>/`: 0px at 375, 768 and 1280 |
| AC-screenshots | PASS | committed on each branch under `test-results/` |
| DoD-gate | PASS | `pnpm gate` per branch (table above) |

Legal review of `/privacy` and `/terms` is pending with Paul or JG (out of scope; flagged on the PR).
