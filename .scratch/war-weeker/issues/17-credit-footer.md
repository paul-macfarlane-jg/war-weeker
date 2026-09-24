# 17: Jahnel Group credit footer

**What to build:** A small, quiet footer that credits Jahnel Group and links to the public source repo, shown on every page. Text: `© 2026 Jahnel Group` followed by a `GitHub` link to https://github.com/paul-macfarlane/war-weeker (opens in a new tab, `rel="noopener noreferrer"`). No personal name. Pre-hackathon: this should land before the Fri 2026-09-25 10:00 AM submission.

**Blocked by:** none

**Status:** done

## Decisions

- Credit Jahnel Group only (decided by Paul, 2026-09-24). No personal name, no license text.
- The year is the current year at render (`new Date().getFullYear()`), so it doesn't go stale.
- One shared component (e.g. `src/components/site-footer.tsx`) with the repo URL as a constant; no new env var.
- It follows the active War Week's theme colors on edition pages (muted foreground, small type) and must not compete with page content.
- On phones it must sit above the fixed bottom tab bar, never under it.

## Acceptance criteria

- [x] The footer shows on edition pages (`/[edition]/…`, including Home, Schedule, Teams, Leaderboard, News, Awards, FAQ, More), `/history`, `/admin/…`, and `/sign-in`.
- [x] It reads `© <current year> Jahnel Group` and has a `GitHub` link to https://github.com/paul-macfarlane/war-weeker that opens in a new tab.
- [ ] At 390px wide, the footer is fully visible above the bottom tab bar when scrolled to the bottom of a page; screenshot as evidence.
- [x] Text meets WCAG AA contrast against the background in at least one light and one dark War Week theme.
- [x] Lint, typecheck, and existing tests pass.

## Comments

- 2026-09-24 (agent): Implemented as `src/components/site-footer.tsx`, rendered inside each themed wrapper (edition layout, `AdminShell`/`AdminRefused`, `/history`, `/sign-in`) so it picks up the War Week's colors. On edition pages it sits before the wrapper's `pb-20`, so it clears the fixed bottom tab bar on phones.
  - Contrast (`text-foreground/70` over `background`, all seeded themes): lowest 5.61:1 (VIII, light), 6.12:1 (VII, light), 9.07:1 (XI, dark). All pass AA.
  - 390px screenshot: verified on `/sign-in` only. Edition and admin pages need a signed-in session, and the agent couldn't create one locally, so the above-the-tab-bar screenshot still needs a manual check.

