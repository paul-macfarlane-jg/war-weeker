# 06: Schedule and now/next

**What to build:** A participant opens `/xi/schedule` and sees the week grouped by Day with each Day Theme, opening on today. Each Schedule Item shows time (ET), title, host, location, description, category, a virtual link when present, and a link to its Competition when it's a competition. The home page shows today's Day Theme and what's on now and next. A Claude user can ask for the schedule of a given day.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Schedule Items are grouped by Day in time order, each Day with its Day Theme, all times in ET whatever the viewer's timezone
- [ ] The page opens scrolled to today when today is within the War Week
- [ ] Categories (competition / education / social / meal / work) are visually distinct; rich descriptions render through the read-only viewer
- [ ] Competition Schedule Items link to `/xi/competitions/[id]`; the link target may 404 until ticket 07 lands
- [ ] The home page shows today's Day Theme and now/next items computed in ET, covered by a vitest test of the now/next logic with a fixed clock
- [ ] MCP `get_schedule(date?)` returns that day's items, or the full schedule when no date is given
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
