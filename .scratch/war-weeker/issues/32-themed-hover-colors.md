# 32: Themed hover states are unreadable (muted colors not themed)

**What to build:** On every Appearance-Themed page, hovering a `ghost` or `outline` button turns it near-white with the theme's pale foreground text, so the label disappears (regression round 1, ticket 29: the rich-text "Video" toolbar button while its popover is open; the top-nav "Sign out" button; any admin ghost button). Make the hover, popover, secondary and input colors follow the Appearance Theme.

**Blocked by:** none

**Status:** done

**Severity:** fix-tonight (visible on every hover during the demo)

## Cause

`src/lib/theme.ts` `themeStyle()` sets `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--ring` and the font, but not `--muted`, `--muted-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground` or `--input`. Those stay at the light-scheme defaults in `src/app/globals.css` (`--muted: oklch(0.97 0 0)`), and `src/components/ui/button.tsx` hovers `ghost`/`outline` with `bg-muted text-foreground`. On a dark edition (XI: background `#000000`, foreground `#d1ffd6`) that is white on white.

## Decisions

- Derive the missing tokens from the theme rather than adding seed fields: `--muted` and `--secondary` = `color-mix(in oklch, <background>, <foreground> 12%)`, `--muted-foreground` and `--secondary-foreground` = `color-mix(in oklch, <foreground>, <background> 35%)` (keep ≥ 4.5:1 on the background), `--popover`/`--popover-foreground` = card colors, `--input` = `color-mix(in oklch, <background>, <foreground> 20%)`. Pure function, no schema change.
- Past editions with light backgrounds (Survivor, Harry Potter) must still read correctly: the mix is symmetric so it works both ways.

## Acceptance criteria

- [x] `themeStyle()` emits the tokens above; `src/lib/theme.test.ts` covers a dark and a light theme and asserts every token that `button.tsx` variants reference is set.
- [x] Hovering "Sign out" in the XI top nav, a rich-text toolbar button, and an outline button on `/x` keeps the label readable (screenshot of each under `test-results/32-themed-hover-colors/`).
- [x] `pnpm gate` passes.

## Comments

**[CLOSEOUT]** (2026-09-24, branch `fix/32-33-hover-and-overflow`, one PR with ticket 33)

- Delivered in the main session (Opus 5.5), no workers.
- `pnpm gate` PASS (typecheck, lint, 498 tests, build, smoke 139 ok).
- Evidence: `pnpm tsx scripts/fix-32-33-evidence.ts` against a local build and seeded Postgres.
- `themeStyle` is `warWeekThemeStyle` in `src/lib/theme.ts`; it now sets `--muted`, `--muted-foreground`, `--secondary`, `--secondary-foreground`, `--popover`, `--popover-foreground`, `--input` with the decided mixes. `src/lib/theme.test.ts` covers a dark (XI) and a light theme and every color token `button.tsx` draws (destructive stays the fixed app red). PASS.
- Hovered label colors: XI Sign out, open Video toolbar button and Bold toolbar button all `rgb(209,255,214)` on `oklch(0.115 0.009 148)`; `/x` outline button `rgb(28,25,23)` on `oklch(0.88 0.024 90)`. Screenshots: `test-results/32-themed-hover-colors/01-xi-sign-out-hover.png`, `02-toolbar-video-open-hover.png`, `03-toolbar-bold-hover.png`, `04-x-outline-button-hover.png`. PASS.
- Deviation: none.

**[AI CODE REVIEW]** (2026-09-24, `/code-review` since `staging`, two axes)

- Standards: one hard finding, `docs/agents/testing.md` requires clearing `test-results/` per work package; fixed by removing ticket 29's evidence (still at `73a8588`). Judgement call: `scripts/fix-32-33-evidence.ts` duplicates the CDP harness of `scripts/regression-29-evidence.ts`; kept, matching the per-ticket evidence-script pattern.
- Spec: no missing requirements, no scope creep, nothing wrong; only the Status/AC boxes were still open, closed in this commit.
