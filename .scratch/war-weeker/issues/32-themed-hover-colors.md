# 32: Themed hover states are unreadable (muted colors not themed)

**What to build:** On every Appearance-Themed page, hovering a `ghost` or `outline` button turns it near-white with the theme's pale foreground text, so the label disappears (regression round 1, ticket 29: the rich-text "Video" toolbar button while its popover is open; the top-nav "Sign out" button; any admin ghost button). Make the hover, popover, secondary and input colors follow the Appearance Theme.

**Blocked by:** none

**Status:** in-progress

**Severity:** fix-tonight (visible on every hover during the demo)

## Cause

`src/lib/theme.ts` `themeStyle()` sets `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--background`, `--foreground`, `--card`, `--card-foreground`, `--border`, `--ring` and the font, but not `--muted`, `--muted-foreground`, `--popover`, `--popover-foreground`, `--secondary`, `--secondary-foreground` or `--input`. Those stay at the light-scheme defaults in `src/app/globals.css` (`--muted: oklch(0.97 0 0)`), and `src/components/ui/button.tsx` hovers `ghost`/`outline` with `bg-muted text-foreground`. On a dark edition (XI: background `#000000`, foreground `#d1ffd6`) that is white on white.

## Decisions

- Derive the missing tokens from the theme rather than adding seed fields: `--muted` and `--secondary` = `color-mix(in oklch, <background>, <foreground> 12%)`, `--muted-foreground` and `--secondary-foreground` = `color-mix(in oklch, <foreground>, <background> 35%)` (keep ≥ 4.5:1 on the background), `--popover`/`--popover-foreground` = card colors, `--input` = `color-mix(in oklch, <background>, <foreground> 20%)`. Pure function, no schema change.
- Past editions with light backgrounds (Survivor, Harry Potter) must still read correctly: the mix is symmetric so it works both ways.

## Acceptance criteria

- [ ] `themeStyle()` emits the tokens above; `src/lib/theme.test.ts` covers a dark and a light theme and asserts every token that `button.tsx` variants reference is set.
- [ ] Hovering "Sign out" in the XI top nav, a rich-text toolbar button, and an outline button on `/x` keeps the label readable (screenshot of each under `test-results/32-themed-hover-colors/`).
- [ ] `pnpm gate` passes.

## Comments
