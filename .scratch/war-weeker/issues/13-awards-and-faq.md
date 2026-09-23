# 13: Awards and FAQ

**What to build:** A participant sees the War Week's Awards and their recipients (Participants and/or a Team) on `/xi/awards`, and the FAQ on `/xi/faq`, both reachable from the More tab. An Organizer can create, edit and delete Awards in admin. FAQ Items come from the seed only. A Claude user can ask for Awards and the FAQ.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] `/xi/awards` lists Awards with name, description and recipients; Awards don't affect Standings
- [ ] Organizer-only server actions create, edit and delete Awards with Participant and/or one Team recipients
- [ ] `/xi/faq` lists FAQ Items in sort order, with rich answers through the read-only viewer
- [ ] MCP `get_awards` and `get_faq` return the same data
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
