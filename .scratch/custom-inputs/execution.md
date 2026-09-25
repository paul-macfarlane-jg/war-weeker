# Execution record — custom-inputs (Phase A)

Contract: [spec.md](./spec.md). This record covers **Phase A** (form controls,
repo rule, lint check). Phases B and C are separate `/atlas-implement` runs and
separate PRs into `staging`, in that order, per the operator's instructions.

## [EXECUTION PLAN]

Branch `feat/custom-inputs-phase-a` from `staging` @ `54aaae5`, worked in
`.claude/worktrees/custom-inputs/war-weeker`. Runs in parallel with the
admin-polish session, which owns `competitions-editor.tsx`,
`teams-editor.tsx`, `war-week-settings-form.tsx` and `schedule-item-form.tsx`
until its PRs merge.

Resolved decisions:

- **Theming.** `src/lib/theme.ts` already maps the Appearance Theme onto the
  shadcn tokens as inline `style` on each themed root (`[edition]/layout`,
  `admin-shell`, `archive`, `install`, `sign-in`, `about`). What is missing is
  that Base UI portals render into `<body>`, outside those roots. D1 adds a
  `ThemeRoot` container context so every Select/Popover/Combobox portal mounts
  inside the themed root and inherits the edition's variables. `globals.css`
  keeps the neutral defaults for pages with no War Week.
- **Form pattern.** The operator asked for "the `useActionState` pattern from
  ticket 18"; no form uses `useActionState` (ticket 18 is `needs-triage`,
  post-hackathon). Interpreted as: keep each form's existing controlled
  `useState` + `useTransition` + typed server-action call. Converted controls
  stay controlled and post the same names and formats (`YYYY-MM-DD`, `HH:MM`,
  `#rrggbb`, ids). No server action, zod or schema changes. Queued for
  confirmation; does not block.
- **Lint rule and the four shared forms** land last (D5), only after
  admin-polish merges to `staging`; if it has not merged when D1–D4 are done,
  Phase A ships as PR "A1" (steps 1–4 minus the lint rule) and D5 becomes PR
  "A2".

### Deliverables

| ID | Slice | Files | Model |
|---|---|---|---|
| D1 | shadcn components via CLI (`select`, `combobox`, `popover`, `calendar`, `switch`, `input`, `textarea`, `label`), `react-day-picker`, `ThemeRoot` portal container wired into every themed root, token check in `globals.css` | `src/components/ui/*`, `src/components/theme-root.tsx`, themed roots, `globals.css`, `package.json` | sonnet |
| D2a | `parseTime` + 5-minute option list (unit-tested), `TimeCombobox`, `DatePicker`, `DateRangePicker` (Days as dots, refuses a range leaving a Day outside with the existing error text), convert `days-editor.tsx` | `src/lib/time-options.ts(.test)`, `src/components/time-combobox.tsx`, `date-picker.tsx`, `date-range-picker.tsx(.test)`, `days-editor.tsx` | opus |
| D2b | `EntityCombobox`, `ColorField` (hex + theme/Team swatches), convert `points-entry-form.tsx` and `you.tsx` (YouPicker) | `src/components/entity-combobox.tsx`, `color-field.tsx`, `points-entry-form.tsx`, `you.tsx` | opus |
| D3 | convert `award-form.tsx` (Select + multi EntityCombobox) and `announcement-form.tsx` (Switch); shadcn rule in `CLAUDE.md` and `docs/maintainers-guide.md` | those files | opus |
| D4 | `scripts/custom-inputs-evidence.ts` (CDP; XI + one dark past edition; 375/1280; popovers open; overflow sweep 375/768/812/1024/1280) and committed screenshots | `scripts/`, `test-results/custom-inputs-a-*/` | sonnet |
| D5 | after admin-polish merges: sync with `staging`, convert the four shared forms (range picker in settings, time combobox + selects in schedule item, selects/switch in competitions, color + select + switch in teams), ESLint `no-restricted-syntax` rule off for `src/components/ui/**`, documented one-off failing run | the four forms, `eslint.config.mjs` | opus |

Structure: wave. D1 → (D2a ∥ D2b in own worktrees) → D3 → D4 → D5.

### Verification map

| Criterion | Command / action | Surface | Evidence | Earliest |
|---|---|---|---|---|
| A: no native controls + lint | grep sweep of `src/` outside `ui/` is empty; `pnpm lint` passes; one-off failing run on a fixture recorded | local | `test-results/custom-inputs-a-lint/` | after D5 |
| A: forms post same values | `pnpm smoke` on a private DB; CDP save round-trips | local Postgres | `test-results/custom-inputs-a-forms/` | after D3 |
| A: `parseTime` tests, range refusal | `pnpm test` | local | `test-results/custom-inputs-a-unit/vitest.txt` | after D2a |
| A: You picker + clear | CDP evidence | local | `test-results/custom-inputs-a-you/` | after D2b |
| docs rule | grep | local | closeout | after D3 |
| screenshots | evidence script | local | `test-results/custom-inputs-a-forms/`, `-pages/` | after D3, rerun after D5 |
| overflow sweep | evidence script | local | `test-results/custom-inputs-a-overflow/overflow.txt` | after D3, rerun after D5 |
| `pnpm gate` | `DATABASE_URL=<war_weeker_ci> pnpm gate` | local Postgres | `test-results/custom-inputs-a-gate/gate.txt` | before PR |

Human gates: none at plan time. Sign-in on staging is not needed for local
evidence (CDP script inserts a session).

## [PROGRESS]

- 2026-09-25 01:44Z: claimed; branch and worktree created; plan recorded.
- 2026-09-25 ~02:10Z: D1 (shadcn components + `ThemeRoot`), D2a (time/date/range pickers, Days editor), D2b (`EntityCombobox`, `ColorField`, Points Entry form, You picker) and D3 (Award + Announcement forms, shadcn rule in `CLAUDE.md` and the maintainer's guide) accepted and integrated. Orchestrator fix `c54ba70`: the Award Team Select showed the raw id (Base UI needs `items`). Old evidence dirs `32-*`/`33-*` removed with Paul's OK.
- Paused for the night: D4 (evidence script) stopped mid-run. Its partial `scripts/custom-inputs-evidence.ts` and `test-results/custom-inputs-a-*` stay uncommitted in the worktree. D5 waits for the admin-polish PRs to merge into `staging`.
- Form pattern (Paul: "ideally best practice"): the wrappers post named hidden inputs, so they're ready for `useActionState`. The full `useActionState` migration stays in ticket 18 unless Paul pulls it in.
- 2026-09-25 ~03:45Z: the repo was renamed to JG War Week and moved to `~/jg-code/jg-war-week` (ticket 37) mid-run; worktrees repaired. Admin polish (#54–#59) and the rename (#61) merged to `staging`, so D5 went into this same PR instead of a separate "A2". `staging` merged in as `66932f3`; this branch's `theme-root.tsx` and `ui/combobox.tsx` kept (staging held copies of D1 without the review fixes).
- D5 (four shared forms + lint rule), D4 (evidence) accepted. Smoke's two admin-form checks updated to read the options from the page's props (`80fd221`), then tightened after review (`4230257`).

## [SCOPE CHANGE]

- Phase A shipped as one PR (the planned A1/A2 split was only a fallback if admin polish hadn't merged).
- `scripts/smoke.ts`: the `/admin/points` and `/admin/awards/new` checks asserted native `<option>` markup. The shadcn controls render options only when opened, so the checks now assert the same Competitions, Teams and Participants reach the form as props (`hasNameProp`), and that the Points Entry form itself rendered.
- `scripts/about-media.ts`: `selectCompetition` drives the Competition combobox instead of a `<select>` (not rerun).
- Form handling stays controlled `useState` + typed server-action calls. Paul asked for best practice; the wrappers post named hidden inputs, so they're ready for `useActionState`, which stays ticket 18 (post-freeze).

## [AI CODE REVIEW]

Three fresh-context reviews (opus): both axes on `54aaae5..5100c93`, then both axes on D5 + the smoke change (`9452e5f`, `80fd221`). Adjudicated by the orchestrator.

**Technical implementation and spec conformity**

| Severity | Finding | Paths | Disposition |
|---|---|---|---|
| blocking | Range picker committed/refused after one tap (react-day-picker `addToRange`), so "tap start, then end" failed | `date-range-picker.tsx` | resolved `ef0f3e4`: pure `nextRangeSelection` in `src/lib/day-range.ts`, unit-tested |
| blocking | Award Team Select showed the raw id (Base UI needs `items`) | `award-form.tsx` | resolved `c54ba70` (acceptance screen) |
| blocking | Gate smoke failed 2 checks asserting `<option>` markup | `scripts/smoke.ts` | resolved `80fd221`, tightened `4230257` |
| non-blocking | TimeCombobox Enter picked the highlighted option, disagreeing with blur | `time-combobox.tsx` | resolved `ef0f3e4` |
| non-blocking | ColorField swatch grid overflowed its popover; duplicate keys | `color-field.tsx` | resolved `ef0f3e4` |
| non-blocking | Points/Note inputs 32px; SelectItem, Switch, chip-remove hit areas < 44px; chip remove unnamed | several | resolved `ef0f3e4` |
| non-blocking | Converted controls dropped posted `name`s | `points-entry-form.tsx`, `award-form.tsx` | resolved `ef0f3e4` |
| non-blocking | `about-media.ts` queried the removed `<select>` | `scripts/about-media.ts` | resolved `ef0f3e4` |
| non-blocking | Date value helpers untested in a component file; client imported `@/lib/setup` | `date-picker.tsx`, `date-range-picker.tsx` | resolved `ef0f3e4` (`src/lib/date-value.ts`, `src/lib/day-range.ts`) |
| non-blocking | Lint rule missed shadcn `<Input type=…>` and `type={"…"}` | `eslint.config.mjs` | resolved `4230257` (spreads can't be seen; noted in the rule) |
| non-blocking | Popups inside an `overflow-hidden` themed root would clip | `theme-root.tsx` | accepted: none exist today; the guide says so |
| non-blocking | Competition detail only in the dropdown; `OptionSelect` placeholder unreachable; native `required` gone from dates/colors (server still validates); disabled Switch label not dimmed; Scoring select may show raw `team` in free-for-all | several | accepted |

**Coding standards**

| Severity | Finding | Paths | Disposition |
|---|---|---|---|
| non-blocking | "No matches." used a banned term | `entity-combobox.tsx` | resolved `ef0f3e4` ("Nothing found.") |
| non-blocking | Duplicated hidden-input code, `cn()` on static strings, namespace React imports, `Ref<never>` cast, duplicated Team items, redundant Label classes | several | resolved `ef0f3e4` (`FormValueInput`, named imports, typed ref) |
| non-blocking | Maintainer's-guide recipe inaccurate / out of voice | `docs/maintainers-guide.md` | resolved `ef0f3e4` |
| non-blocking | Hex parsing duplicated with `theme.ts`; `useWide` duplicates a media-query hook; Team swatch mapping written twice | `color.ts`, `date-range-picker.tsx`, `teams-editor.tsx` | accepted (small; extract on next use) |
| non-blocking | CLAUDE.md rule sits inside an Atlas-managed block | `CLAUDE.md` | accepted: next to the other repo rules; a setup rerun reports it as a preserved edit |
| non-blocking | Lockfile landed one commit after `package.json` | `pnpm-lock.yaml` | accepted: squash-merge the PR |

## [CLOSEOUT]

**Deliverables**

| ID | What | Worker | Commit |
|---|---|---|---|
| D1 | shadcn components (select, combobox, popover, calendar, switch, input, textarea, label, input-group), `ThemeRoot` portal container | sonnet | `2f37c91` + lockfile `7cc1324` |
| D2a | `parseTime` / time options, `TimeCombobox`, `DatePicker`, `DateRangePicker`, Days editor | opus | `0ca4109` |
| D2b | `EntityCombobox`, `ColorField`, Points Entry form, "Which one is you?" picker | sonnet | `2f0466d` |
| D3 | Award + Announcement forms, shadcn rule in `CLAUDE.md` and the maintainer's guide | sonnet | `58d19fe` (+ orchestrator fix `c54ba70`) |
| R1 | Aggregate review fixes | opus | `ef0f3e4` |
| D5 | War Week settings, Schedule Item, Competitions, Teams forms; ESLint rule | opus | `9452e5f` (+ orchestrator `80fd221`, `4230257`) |
| D4 | CDP evidence script, screenshots, round-trips, overflow sweep | sonnet (3 dispatches; two interrupted) | `420e091` |

**Verdicts** (local run surface; no deploy in this slice)

| Criterion | Verdict | Evidence |
|---|---|---|
| A: no native select/date/time/color/checkbox in `src/` outside `ui/`; lint enforces it | PASS | grep finds only doc comments; `pnpm lint` 0 errors; `test-results/custom-inputs-a-lint/fixture-failing-run.txt` (7 errors on a throwaway fixture, exit 1) |
| A: every admin form saves the same values; smoke's admin/seed checks pass | PASS | `test-results/custom-inputs-a-forms/round-trips.txt` (9 ok: Points Entry, Award, range refusal, Day, Schedule Item "7:30p"→19:30 + `other`, Team color, Leader switch, You pick/clear); smoke 148 ok in `test-results/custom-inputs-a-gate/gate.txt` |
| A: `parseTime` tests; range picker refuses with the existing text | PASS | `src/lib/time-options.test.ts`, `src/lib/day-range.test.ts` in the gate's 614 tests; browser refusal in round-trips |
| A: "Which one is you?" combobox and "Not me / clear" | PASS | round-trips (2 ok); `test-results/custom-inputs-a-pages/01-*`, `02-*` |
| CLAUDE.md and maintainer's guide state the shadcn rule | PASS | `CLAUDE.md` Repository-specific rules; guide recipe "Add or change a form control" |
| Screenshots: every converted form + Teams, Standings, More; 375 and 1280; XI and a dark past edition (IX); popups open | PASS | 60 in `test-results/custom-inputs-a-forms/`, 16 in `test-results/custom-inputs-a-pages/` |
| Zero horizontal overflow at 375/768/812/1024/1280 | PASS | `test-results/custom-inputs-a-overflow/overflow.txt` (149/149 at 0px, incl. popups open at 375) |
| `pnpm gate` | PASS | `test-results/custom-inputs-a-gate/gate.txt`, run at `4230257` on a private Postgres DB |
| B, C criteria | not in this PR | Phases B and C are separate runs |

Evidence commit `420e091` has the same `src/` as `4230257`; later commits touch only `eslint.config.mjs`, `scripts/smoke.ts` and evidence.

Verified run command: `DATABASE_URL=<private db> DATABASE_DRIVER=pg pnpm db:migrate && pnpm gate`; evidence: `pnpm build && pnpm tsx scripts/custom-inputs-evidence.ts` against a private DB.

Isolation check: D2a and D2b ran in parallel in separate worktrees as predicted; their diffs touched disjoint files, so no merge conflict occurred.

PR: https://github.com/paul-macfarlane/jg-war-week/pull/63 (into `staging`).

---

# Execution record — custom-inputs (Phase B)

Contract: [spec.md](./spec.md), Phase B (form structure and feedback).
Overnight run 2026-09-25 with Paul asleep; open decisions decided by the
orchestrator and listed under [SCOPE CHANGE].

## [EXECUTION PLAN]

Branch `feat/custom-inputs-phase-b` from `staging` @ `d5aa7e6`, worked in
`.claude/worktrees/custom-inputs-b/war-weeker`; B1–B3 in parallel detached
worktrees `b1`–`b3` (disjoint files), cherry-picked onto the branch.

Resolved decisions:

- **Foundation (B0, orchestrator).** shadcn `field`, `alert-dialog`,
  `sonner` (+ `separator`) via the CLI. The Toaster drops `next-themes`
  (no light/dark toggle; the Appearance Theme's CSS variables color it) and
  mounts inside `AdminShell`'s `ThemeRoot`. The AlertDialog portal uses
  `useThemeContainer` like Select/Popover. `src/components/confirm-dialog.tsx`
  owns the one confirm pattern: `ConfirmDialog` (controlled) and
  `ConfirmActionButton` (button → dialog → action → toast → refresh).
- **Errors** show in a `FieldError` directly under each form's button row
  and as a toast, so the message is always in the same place.
- **No Slack toast:** the app never posts to Slack (cut in ticket 28).
- **Refusal counts:** no delete action returns counts today; the dialog
  description shows the row's usage summary where it exists and the toast
  shows the server's message verbatim.

| ID | Slice | Files | Model |
|---|---|---|---|
| B0 | shadcn pieces, `ConfirmDialog`, Toaster | `ui/field,alert-dialog,sonner,separator`, `confirm-dialog.tsx`, `admin-shell.tsx` | orchestrator |
| B1 | delete buttons + Standings visibility → dialog + toasts | `delete-*-button.tsx`, `setup-schedule-faq-buttons.tsx`, `announcement-admin-buttons.tsx`, `standings-visibility-controls.tsx` | sonnet |
| B2 | Field layout + toasts | Announcement, Award, Points Entry, FAQ, Schedule Item forms | sonnet |
| B3 | Field layout + dialogs + toasts | settings form, Competitions/Teams/Days editors, `setup-row.tsx`, chips, placement rows | opus |
| B4 | evidence script, screenshots, round-trips, overflow sweep | `scripts/custom-inputs-b-evidence.ts`, `test-results/custom-inputs-b-*/` | sonnet |

Structure: B0 → (B1 ∥ B2 ∥ B3) → B4 → gate.

### Verification map

| Criterion | Command / action | Evidence | Earliest |
|---|---|---|---|
| B: every destructive action in an AlertDialog; refusals show the server's text | `grep window.confirm/alert src` empty; round-trips (cancel keeps, confirm deletes) | `test-results/custom-inputs-b-forms/round-trips.txt` | after B4 |
| B: save/fail toasts | round-trips + screenshots with a toast visible | same dir | after B4 |
| B: Field layout on every form | grep `FieldLabel`; screenshots | same dir | after B4 |
| screenshots 375/1280, XI + IX, dialog open | evidence script | `test-results/custom-inputs-b-forms/` | after B4 |
| overflow 375/768/812/1024/1280 | evidence script | `test-results/custom-inputs-b-overflow/overflow.txt` | after B4 |
| `pnpm gate` | on a private DB | `test-results/custom-inputs-b-gate/gate.txt` | before PR |
## [PROGRESS]

- 2026-09-25 05:20Z: branch and worktrees created; B0 committed (`41c9db9`, `296e158`); B1–B3 dispatched in parallel.
- 05:45Z: B1 (`1db343c`), B2 (`367d9dc`), B3 (`5b19e2b`) accepted and integrated; B4 evidence `cadc944`. Orchestrator `6e67bc2`: `SMOKE_PORT` override so parallel worktrees can run smoke side by side.
- 05:55Z: review fixes `9b1f388`; evidence and gate rerun on that head.

## [SCOPE CHANGE]

- No "Slack post failed" toast: the app never posts to Slack (ticket 28 cut it).
- Refusal counts: no delete action returns counts; dialogs show the row's usage summary and the refusal toast shows the server's message verbatim.
- `scripts/smoke.ts` gained a `SMOKE_PORT` override (default 3100); no check changed.

## [AI CODE REVIEW]

Two fresh-context reviews (opus), both axes on `d5aa7e6..6e67bc2`; adjudicated by the orchestrator. No blocking findings.

**Technical implementation and spec conformity**

| Severity | Finding | Paths | Disposition |
|---|---|---|---|
| non-blocking | Delete triggers (`xs`), form submit/Cancel (`lg`), video-link and Hide/Reveal buttons under 44px on phones | `confirm-dialog.tsx`, five forms, `standings-visibility-controls.tsx` | resolved `9b1f388` |
| non-blocking | Over-max Points warning and video-link hint became red `role="alert"` errors | `points-entry-form.tsx`, `announcement-form.tsx` | resolved `9b1f388` (amber descriptions) |
| non-blocking | Confirm button colour keyed off the label text | `confirm-dialog.tsx` | resolved `9b1f388` (`destructive` prop) |
| non-blocking | Focus falls to `body` after a setup-row delete; its dialog's `pending` never shows | `setup-row.tsx` | accepted |
| non-blocking | `FieldLabel`s beside the rich-text editor label nothing; the editor's own link/image panels still use raw labels | three forms, `rich-text-editor.tsx` | accepted |
| non-blocking | Participants picker's `aria-label` hides the "(n chosen)" label (pre-existing) | `award-form.tsx` | accepted |

**Coding standards**

| Severity | Finding | Paths | Disposition |
|---|---|---|---|
| non-blocking | Maintainer's guide/CLAUDE.md don't describe Field, ConfirmDialog, toasts; portal list stale | docs | resolved `9b1f388` |
| non-blocking | Days hand-roll the usage text | `days-editor.tsx` | resolved `9b1f388` (`usageSummary`) |
| non-blocking | Pin/Unpin toasts had no noun | `announcement-admin-buttons.tsx` | resolved `9b1f388` |
| non-blocking | Standings controls re-implement `ConfirmActionButton`; `SuggestionCombobox` has no `id`; mixed id styles in the settings form; `ActionResult` restates `MutationResult`; "added" vs "saved" toast wording; unused `cn-toast` class from the generated Toaster | several | accepted (small; next touch) |

## [CLOSEOUT]

| ID | What | Worker | Commit |
|---|---|---|---|
| B0 | shadcn field/alert-dialog/sonner/separator; `ConfirmDialog`; Toaster; themed AlertDialog portal | orchestrator | `41c9db9`, `296e158` |
| B1 | delete buttons + Standings visibility → AlertDialog + toasts | sonnet | `1db343c` |
| B2 | Announcement, Award, Points Entry, FAQ, Schedule forms → Field + toasts | sonnet | `367d9dc` |
| B3 | settings form, Days/Competitions/Teams editors, setup rows → Field, dialogs, toasts | opus | `5b19e2b` |
| B4 | evidence script, screenshots, round-trips, overflow | sonnet | `cadc944` (+ rerun) |
| R | smoke port; review fixes | orchestrator | `6e67bc2`, `9b1f388` |

Verdicts (local run surface, private Postgres, production build):

| Criterion | Verdict | Evidence |
|---|---|---|
| B: every destructive action opens an AlertDialog | PASS | `test-results/custom-inputs-b-forms/round-trips.txt` (Cancel keeps the row, Delete removes it; `window.confirm/alert` grep empty); `10-*`, `11-*` screenshots |
| B: refused deletes show the server's text | PASS | round-trips (duplicate Team refusal toast); `13-*` screenshot shows toast + FieldError |
| B: save/fail toasts | PASS | round-trips; `12-*` (save toast), `13-*` (fail toast). Slack toast: approved scope change |
| Story 10: Field layout on every form | PASS | `01-*`…`09-*` screenshots, XI + IX at 375/1280 |
| Screenshots 375/1280, XI + dark IX, dialog open | PASS | 48 PNGs in `test-results/custom-inputs-b-forms/` |
| Zero horizontal overflow 375/768/812/1024/1280 | PASS | `test-results/custom-inputs-b-overflow/overflow.txt` (146/146 at 0px, incl. a dialog open at 375) |
| `pnpm gate` | PASS | `test-results/custom-inputs-b-gate/gate.txt` (typecheck, lint 0 errors, 614 tests, build, smoke 148 ok) |

Verified run command: `DATABASE_URL=<private db> DATABASE_DRIVER=pg SMOKE_PORT=3150 pnpm db:migrate && pnpm gate`; evidence: `pnpm db:migrate && pnpm seed:all && pnpm build && pnpm tsx scripts/custom-inputs-b-evidence.ts` on a private DB.

Isolation check: B1, B2, B3 ran in parallel worktrees on disjoint files as predicted; all three cherry-picked cleanly.

# Execution record — custom-inputs (Phase C)

Contract: [spec.md](./spec.md), Phase C (participant-page building blocks).
Presentation only. Overnight run 2026-09-25; decisions by the orchestrator.

## [EXECUTION PLAN]

Branch `feat/custom-inputs-phase-c`, stacked on `feat/custom-inputs-phase-b`
(merge B first). Worked in `.claude/worktrees/custom-inputs-c/war-weeker`;
C1 and C2 in parallel detached worktrees (disjoint files), cherry-picked.

Resolved decisions:

- **C0 (orchestrator):** shadcn `card`, `tabs`, `badge` (already present),
  `avatar`, `sheet`, `skeleton`; the Sheet portals into `ThemeRoot`.
- **Cards** keep list semantics (`<li>` wrapping a `Card`); the Reveal's
  animated classes stay on the `<li>`. Every smoke-checked string, href,
  anchor and inline theme style is unchanged.
- **Tabs** only on `/[edition]/competitions` with 2+ Competition Groups,
  `keepMounted` so the HTML still holds every group.
- **More on phones:** the bottom-bar "More" tab is a `SheetTrigger`; the
  Sheet lists `moreLinks()` (shared with the `/more` page, which stays as the
  desktop route and deep link).
- **Skeletons:** `loading.tsx` per edition route, `/history` and `/admin`,
  built from `page-skeleton.tsx`.

| ID | Slice | Model | Commit |
|---|---|---|---|
| C0 | shadcn pieces | orchestrator | `f57a534` |
| C1 | Standings, Competitions, Announcements, Awards, roster, Archive, hero, Now/Next on Card/Badge/Avatar/Tabs | opus | `1121713` |
| C2 | More Sheet + `moreLinks` (tested) + Skeleton loading states | sonnet | `33fb8bf` |
| C3 | evidence script, screenshots, checks, overflow sweep | sonnet | — |

### Verification map

| Criterion | Command / action | Evidence | Earliest |
|---|---|---|---|
| C: surfaces on shadcn | `[data-slot=card]` on every participant page; screenshots | `test-results/custom-inputs-c-pages/` | after C3 |
| C: More is a Sheet on phones | evidence check (dialog opens at 375, links, closes on navigate) | `checks.txt` | after C3 |
| C: skeletons | `loading.tsx` inventory + skeleton shot when capturable | `checks.txt` | after C3 |
| screenshots 375/1280 XI + IX | evidence script | `custom-inputs-c-pages/` | after C3 |
| overflow sweep | evidence script | `custom-inputs-c-overflow/overflow.txt` | after C3 |
| `pnpm gate` | private DB | `custom-inputs-c-gate/gate.txt` | before PR |

## [PROGRESS]

- 2026-09-25 06:00Z: branch created on the Phase B head; C0 committed; C1 ∥ C2 dispatched.
- 06:40Z: C1 and C2 accepted and integrated; C3 dispatched.
- ~07:00–09:30Z: network drop; C3's evidence run hung and was stopped (retry 1). Smoke on the Phase C head failed 5 checks (found by the brackets UI worker): `/more` called `moreLinks()` from a `"use client"` module, and `competitions/loading.tsx` turned a bad Competition id's 404 into a streamed 200. Fixed in `39b9621`; tracked `node_modules` symlink removed (`538d5b4`); Phase B merged in (`a1a6f14`).
- 09:45Z: review fixes `8c5fbae`; the orchestrator finished C3 (two script bugs: it clicked the hidden desktop nav, and read team rows while XI's Standings were hidden) and reran evidence and gate on that head.

## [SCOPE CHANGE]

- Skeletons are scoped with route groups (`[edition]/(home)`, `competitions/(list)`); no admin skeleton. A loading boundary above a page that calls `notFound()` streams its 404 as a 200.
- Live skeleton capture wasn't scripted (streaming timing); the evidence lists each `loading.tsx` and that it uses `page-skeleton`.

## [AI CODE REVIEW]

One fresh-context review (opus), both axes on the Phase C diff; adjudicated by the orchestrator.

| Axis | Severity | Finding | Paths | Disposition |
|---|---|---|---|---|
| technical | blocking | `admin/loading.tsx` wraps every admin page, so a bad id's `notFound()` streams as 200 | `src/app/admin/loading.tsx` | resolved `8c5fbae` (removed) |
| technical | blocking | `/more` crashed calling a client-module function; competition 404 → 200 (smoke) | `more/page.tsx`, `competitions/loading.tsx` | resolved `39b9621` |
| technical | non-blocking | Group tabs ~26px, Sheet close ~28px, no safe-area padding in the Sheet | `competitions/(list)/page.tsx`, `ui/sheet.tsx`, `more-menu.tsx` | resolved `8c5fbae` |
| technical | non-blocking | Skeleton gap-4 vs pages' gap-6 | `page-skeleton.tsx` | resolved `8c5fbae` |
| technical | non-blocking | Home skeleton padding differs slightly; shadcn Avatar adds an accent outline; long badges clip rather than wrap; unnamed `<section>`s became Cards | several | accepted |
| standards | non-blocking | `src/lib/more-links.ts` imports lucide icons (lib is meant to be pure) | `src/lib/more-links.ts` | accepted: needed server-side; small |
| standards | non-blocking | unused re-export | `more-menu.tsx` | resolved `8c5fbae` |

## [CLOSEOUT]

| ID | What | Worker | Commit |
|---|---|---|---|
| C0 | shadcn card/tabs/avatar/sheet/skeleton; Sheet portal | orchestrator | `f57a534` |
| C1 | participant surfaces on Card/Badge/Avatar/Tabs | opus | `1121713` |
| C2 | More Sheet, `moreLinks`, skeletons | sonnet | `33fb8bf` |
| C3 | evidence script | sonnet (hung) → orchestrator | this commit |
| R | smoke fixes, review fixes | orchestrator | `39b9621`, `538d5b4`, `8c5fbae` |

Verdicts (local run surface, private Postgres, production build):

| Criterion | Verdict | Evidence |
|---|---|---|
| C: listed participant surfaces use shadcn components | PASS | `test-results/custom-inputs-c-pages/checks.txt` (`[data-slot=card]` on every participant page); screenshots |
| C: More menu is a Sheet on phones | PASS | `checks.txt` (opens at 375 with every link; tapping navigates and closes); `09-more-sheet-xi-375.png` |
| C: skeletons while loading | PASS (static) | `checks.txt` inventory of `loading.tsx` files using `page-skeleton`; no live capture (scope change) |
| Screenshots: Teams, Standings, More + other participant pages, 375/1280, XI + dark IX | PASS | `test-results/custom-inputs-c-pages/*.png` |
| Zero horizontal overflow 375/768/812/1024/1280 | PASS | `test-results/custom-inputs-c-overflow/overflow.txt` (all 0px, incl. the Sheet open) |
| `pnpm gate` | PASS | `test-results/custom-inputs-c-gate/gate.txt` (lint 0 errors, 618 tests, build, smoke 148 ok) |

Verified run command: `DATABASE_URL=<private db> DATABASE_DRIVER=pg SMOKE_PORT=3152 pnpm db:migrate && pnpm gate`; evidence: `pnpm db:migrate && pnpm seed:all && pnpm build && pnpm tsx scripts/custom-inputs-c-evidence.ts`.

Isolation check: C1 and C2 ran in parallel on disjoint files and cherry-picked cleanly.
