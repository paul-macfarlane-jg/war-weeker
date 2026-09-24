# 27: Setup screens: Schedule and FAQ

**What to build:** Organizers can create, edit and delete Schedule Items (Day, start and end time ET, title, host, location, virtual link, category, linked Competition, rich-text description) and FAQ items under `/admin/setup`.

**Blocked by:** 25 (the `/admin/setup` shell). It can run parallel to 26.

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24. Confirm at the start of `/implement`.

- The seed-vs-UI rule, validation reuse and organizer check are the same as in ticket 25.
- The description uses the shared rich-text editor, so video embeds come for free once 23 merges. Don't depend on it.
- The Schedule admin lists items grouped by Day in time order, the same as the public page. The unique key `(day, startTime, title)` gives a field error.
- FAQ items can be reordered with up and down buttons if the table has an order column. Otherwise follow the existing FAQ ordering.
- It turns on the "Schedule" and "FAQ" links on the setup landing.

## Acceptance criteria

- [ ] Server actions with unit tests on validation (end before start, duplicate key).
- [ ] A new Schedule Item appears on `/xi/schedule` and in Now/Next when current. A new FAQ item appears on `/xi/faq`. Smoke covers one of each.
- [ ] Screenshots at 390px and desktop under `test-results/27-setup-schedule-faq/`.
- [ ] The spec stretch item 6 is marked delivered once 25–27 have all merged; whichever lands last does it.
- [ ] `pnpm gate` passes.

## Comments
