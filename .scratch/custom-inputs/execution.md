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
