# 35: Admin pages scroll sideways on phone and tablet widths

**What to build:** Found in the production smoke test (2026-09-24). Three admin pages make the whole page scroll sideways below ~1280px, measured as `document.documentElement.scrollWidth - clientWidth` on https://war-weeker.vercel.app:

| Page | 375 | 768 | 1024 | 1280 |
| --- | --- | --- | --- | --- |
| `/admin/points` | 441 | 288 | 32 | 0 |
| `/admin/announcements` | 249 | 96 | 0 | 0 |
| `/admin/awards/new` | 25 | 0 | 0 | 0 |

Causes:

1. Ledger / Announcements / Awards tables: the `sr-only` "Actions" header is `position: absolute`, and its `overflow-x-auto` wrapper isn't positioned, so the span escapes the scroller and widens the page. The table itself scrolls inside its wrapper as intended.
2. Points Entry form: the Participant `<select>` sizes itself to its longest option, so the form grows wider than a phone.
3. New Award form: `<fieldset>` defaults to `min-inline-size: min-content`, so the two-column Participants grid pushes it out.
4. Announcements header: "Announcements" plus "New Announcement" doesn't fit a 360px content box with a classic scrollbar.

**Blocked by:** none

**Status:** done

**Severity:** fix-before-submission (an Organizer entering points on a phone gets a sideways-scrolling page, the same class of bug as ticket 33)

## Decisions

- Table wrappers become `relative overflow-x-auto`, so the scroller clips the `sr-only` span.
- The Points Entry form's `fieldClass` gets `w-full`, so selects shrink to the column.
- The Award form's Recipients fieldset gets `min-w-0`.
- The Announcements header row gets `flex-wrap`.

## Acceptance criteria

- [x] `/admin/points`, `/admin/announcements`, `/admin/awards` and `/admin/awards/new` have zero horizontal overflow at 375, 768, 812, 900, 1024 and 1280px.
- [x] `pnpm gate` passes.

## Comments

**[CLOSEOUT]** (2026-09-24, branch `fix/35-admin-overflow`)

- PR: https://github.com/paul-macfarlane/war-weeker/pull/49
- Found during the production smoke test; see the smoke notes in ticket 34's comments for everything else checked.
- Verification: the same classes were applied to the live production DOM in same-origin iframes at 375, 768, 812, 900, 1024 and 1280px. All four pages measured 0px overflow (before: see the table above). Re-check on production after deploy.
- `pnpm gate` PASS (typecheck, lint, 498 tests, build, smoke 139 ok).
