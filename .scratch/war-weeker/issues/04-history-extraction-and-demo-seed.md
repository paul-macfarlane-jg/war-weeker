# 04: History extraction and demo seed

**What to build:** Ten years of War Week history, plus War Week XI's real schedule, Teams, roster and Competitions, exist as committed, editable seed JSON produced from the old wiki pages. The XI demo seed is ready for the demo: live, mid-week, close race, standings hidden.

**Blocked by:** 03

**Status:** ready-for-agent

**Notes:**
- The extraction script is run by hand at dev time. It sends each `old-wikis/<year>.txt` to the Claude API (`claude-sonnet-5`, structured output against the shared seed schemas) and writes one seed file per year. It uses `ANTHROPIC_API_KEY` and is never called at runtime.
- Historical content comes only from `old-wikis/` (Competiscore data is gone). Past years may have no Points Entries; winner and highlights are stored text.
- Don't include real employee personal data beyond what's already on the public JG wiki. Participant emails may be omitted.

- [ ] The script produces seed JSON for 2016–2026, and every file passes the seed schema (checked by the vitest test from 03)
- [ ] Output is hand-reviewed and committed; the app never calls Claude at runtime
- [ ] 2016–2025 are `complete`, each with edition, year, dates, Story Theme, Teams and colors, winner, Awards, highlights, wiki URL and an Appearance Theme. 2016–2018 may be sparse
- [ ] XI (2026, The Matrix, Red vs. Blue) is `live`, with real Days, Schedule Items, Teams, roster and Competitions from the wiki, and a green-on-black Matrix Appearance Theme
- [ ] The XI demo data has fictional mid-week Points Entries with a close race, including at least one fractional value and one Counts-Toward-Team-off entry. It also has a few Announcements (one pinned, one with a video URL), a few Awards, `standingsHidden` on, and the organizer allowlist
- [ ] One documented command loads all seeds into local Postgres
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
