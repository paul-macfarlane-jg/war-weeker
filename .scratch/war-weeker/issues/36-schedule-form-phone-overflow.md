# 36: Schedule Item form scrolls sideways on phone width

**What to build:** Found in production regression round 2 (2026-09-24). `/admin/setup/schedule/new` and `/admin/setup/schedule/<id>` make the whole page scroll sideways at phone width, measured as `document.documentElement.scrollWidth - clientWidth` on https://war-weeker.vercel.app:

| Page | 360 | 375 | 768 | 812 | 1024 | 1280 |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin/setup/schedule/new` | 188 | 173 | 0 | 0 | 0 | 0 |
| `/admin/setup/schedule/<id>` | — | 173 | 0 | 0 | 0 | 0 |

Cause: the Day `<select>` sizes itself to its longest option ("Mon, Sep 21 · …", 517px wide), and the one-column grid stretches every field in its row to match. Ticket 35 fixed the same cause in the Points Entry form.

**Blocked by:** none

**Status:** done

**Severity:** fix-before-submission (the same class of bug as tickets 33 and 35; an Organizer editing the schedule on a phone gets a sideways-scrolling page)

## Decisions

- The Schedule Item form's `fieldClass` gets `w-full`, so selects and inputs shrink to their column (the ticket 35 Points Entry fix).

## Acceptance criteria

- [x] `/admin/setup/schedule/new` and `/admin/setup/schedule/<id>` have zero horizontal overflow at 375, 768, 812, 1024 and 1280px.
- [x] `pnpm gate` passes.

## Comments

**[CLOSEOUT]** (2026-09-24, branch `fix/36-schedule-form-overflow`)

- PR: https://github.com/paul-macfarlane/war-weeker/pull/51
- Found in production regression round 2; see ticket 34's comments for everything else checked.
- Change: `w-full` added to `fieldClass` in `src/components/schedule-item-form.tsx`.
- Verification: `w-full` applied to the form's fields on the live production DOM in same-origin iframes. Both pages went from 173px to 0px at 375, and stayed 0px at 768, 812, 1024 and 1280. Re-check on production after deploy.
- `pnpm gate` PASS (typecheck, lint 0 errors, 498 tests, build, smoke 139 ok).
