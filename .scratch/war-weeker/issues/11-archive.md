# 11: Archive

**What to build:** A participant opens `/history` and sees every past War Week (2016–2025). Each one opens in its own Appearance Theme and shows edition, year, dates, Story Theme, Teams and colors, winner, Awards, highlights and a link to the original wiki page. 2016–2018 appear as link-only cards in the same layout. A Claude user can ask about any past War Week.

**Blocked by:** 04

**Status:** in-progress

- [ ] `/history` lists all `complete` War Weeks, newest first
- [ ] Each past War Week renders in its own Appearance Theme (e.g. 2023 Harry Potter, 2025 Survivor) at its edition URL
- [ ] Detail shows the stored winner text (not computed), Teams and colors, Awards, highlights and the wiki link
- [ ] Sparse early years render as link-only cards without layout breakage
- [ ] MCP `list_history` and `get_history(year)` return the same data; an unknown year returns a clear not-found result
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
