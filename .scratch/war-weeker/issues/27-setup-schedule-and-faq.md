# 27: Setup screens: Schedule and FAQ

**What to build:** Organizers can create, edit and delete Schedule Items (Day, start and end time ET, title, host, location, virtual link, category, linked Competition, rich-text description) and FAQ items under `/admin/setup`.

**Blocked by:** 25 (the `/admin/setup` shell). It can run parallel to 26.

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24. Confirm at the start of `/implement`.

- The seed-vs-UI rule, validation reuse and organizer check are the same as in ticket 25.
- The description uses the shared rich-text editor, so video embeds come for free once 23 merges. Don't depend on it.
- The Schedule admin lists items grouped by Day in time order, the same as the public page. The unique key `(day, startTime, title)` gives a field error.
- FAQ items can be reordered with up and down buttons if the table has an order column. Otherwise follow the existing FAQ ordering.
- It turns on the "Schedule" and "FAQ" links on the setup landing.

## Acceptance criteria

- [x] Server actions with unit tests on validation (end before start, duplicate key).
- [x] A new Schedule Item appears on `/xi/schedule` and in Now/Next when current. A new FAQ item appears on `/xi/faq`. Smoke covers one of each.
- [x] Screenshots at 390px and desktop under `test-results/27-setup-schedule-faq/`.
- [ ] The spec stretch item 6 is marked delivered once 25–27 have all merged; whichever lands last does it.
- [x] `pnpm gate` passes.

## Comments

- 2026-09-24 (Claude): Implemented on `feat/27-setup-schedule-and-faq` with the decisions above as written. Schedule Items and FAQ Items each get a list page plus new/edit pages under `/admin/setup/schedule` and `/admin/setup/faq`, since the rich-text editor is too heavy for inline rows. The Schedule list reuses `getSchedule`, so it matches the public order. `faq_item.sort_order` exists, so FAQ Items reorder with up/down buttons and new ones go last. Guards: end time after start, the `(day, startTime, title)` key (checked first, and a lost race is refused rather than thrown), a Day or linked Competition from another War Week, and a duplicate FAQ question. A blank description is stored as null and a blank answer is refused. The stretch item 6 line is left in progress because 26 hasn't merged. The duplicate-key error shows as the form's error line, the same as the Days form. `pnpm gate` passed: typecheck, lint, 418 tests, build, and smoke with 126 checks. Screenshots are in `test-results/27-setup-schedule-faq/` (`scripts/setup-schedule-faq-evidence.ts`).
