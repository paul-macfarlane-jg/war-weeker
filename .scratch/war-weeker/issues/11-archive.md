# 11: Archive

**What to build:** A participant opens `/history` and sees every past War Week (2016–2025). Each one opens in its own Appearance Theme and shows edition, year, dates, Story Theme, Teams and colors, winner, Awards, highlights and a link to the original wiki page. 2016–2018 appear as link-only cards in the same layout. A Claude user can ask about any past War Week.

**Blocked by:** 04

**Status:** done

- [x] `/history` lists all `complete` War Weeks, newest first
- [x] Each past War Week renders in its own Appearance Theme (e.g. 2023 Harry Potter, 2025 Survivor) at its edition URL
- [x] Detail shows the stored winner text (not computed), Teams and colors, Awards, highlights and the wiki link
- [x] Sparse early years render as link-only cards without layout breakage
- [x] MCP `list_history` and `get_history(year)` return the same data; an unknown year returns a clear not-found result
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [AI CODE REVIEW] 2026-09-23

Two-axis review of `git diff staging...HEAD`, run as two parallel review agents.

**Standards**
- No hard violations. Layering follows ADR 0001: queries go to lib, and the MCP serializers are pure. Domain terms are correct.
- The evidence wasn't committed at review time. **Fixed**: it's committed in the closeout commit.
- Judgement calls:
  - The "Archive = complete" rule was repeated in SQL, `selectArchive` and the edition page. **Fixed**: `isArchived()` in `src/lib/archive.ts` is now the single rule.
  - The War Week summary fields duplicate `toCurrentWarWeekResult`. Kept: the payloads differ.
  - The wiki link markup appears twice (with different styling). Kept.
  - `edition.toUpperCase()` repeats. This is an existing pattern, so it was kept.
  - The new smoke `callTool` helper sits next to the older inline calls. Kept.
  - `archive-evidence.ts` duplicates `reveal-evidence.ts`. These are one-off scripts, so it was kept.
  - Award-recipient grouping in the query is row shaping, so it was kept.

**Spec**
- All six criteria are implemented.
- The 2025 card read "Details on the original wiki page" even though that year has Teams and highlights. **Fixed**: it now reads "No winner recorded".
- 2021 renders link-only under the data-driven rule (no winner, Teams or Awards). Its highlights still render. Accepted, and the copy now reads "Most of War Week VI's story lives on the original wiki page."
- `get_history(2026)` returns a not-found message that reads like a bug. **Fixed**: the message now says the Archive holds complete War Weeks only and points to `get_current_war_week`.
- Highlights used their text as the React key. **Fixed**: they use the index.
- Past editions keep the Schedule, Leaderboard and News tabs, and the Leaderboard computes from Points Entries. Out of scope here; the winner shown is the stored text.
- `/history` has no primary nav (it isn't an edition page). It links back to the current War Week, and it's reachable from More.
- Scope creep is small: the `WarWeekHero` extraction, the More-page link, and the evidence script.

### [CLOSEOUT] 2026-09-23

- Repository: `war-weeker`, branch `feat/11-archive`, PR into `staging` (URL in the PR itself).
- Deliverables, all by Claude Opus 5.5 (single session, with two review agents):
  - `src/lib/archive.ts` and `src/mcp/history.ts`, with tests (TDD).
  - `src/queries/archive.ts`.
  - The MCP tools `list_history` and `get_history(year)`.
  - `/history` with `ArchiveCard`.
  - `ArchiveDetailView` on a complete War Week's `/[edition]` home.
  - `WarWeekHero`, extracted from the edition home.
  - The More-page link.
  - Smoke checks.
  - `scripts/archive-evidence.ts`.
- DoD:
  - `/history` lists every complete War Week, newest first: **PASS**. Smoke checks that all 10 appear in year-descending order, each card carries its own `--primary`, and 2026 is absent. See `desktop-history.png` and `phone-history.png`.
  - Each past War Week renders in its own Appearance Theme at its edition URL: **PASS**.
    - Smoke checks that `/viii` has `--primary:#740001` and the Harry Potter Story Theme.
    - Screenshots: `desktop-viii-2023.png`, `phone-viii-2023.png`, `desktop-x-2025.png`.
  - Detail shows the stored winner, Teams and colors, Awards, highlights and the wiki link: **PASS**. Smoke checks that `/viii` shows Winner Slytherin, all four Houses, House Cup, Highlights, the 2023 wiki href, and no Slack button.
  - Sparse early years render as link-only cards without layout breakage: **PASS**. Smoke checks `/i`, `/ii` and `/iii` for the link-only copy, no Awards and the wiki href. Screenshots: `phone-i-2016-link-only.png` and `desktop-ii-2017-link-only.png`.
  - MCP `list_history` and `get_history(year)` return the same data, and an unknown year is clearly not found: **PASS**. Smoke checks:
    - `list_history` returns 2025 down to 2016.
    - `get_history(2023)` returns winner Slytherin, 4 Teams, House Cup, highlights and the wiki URL.
    - `get_history(2030)` and `get_history(2026)` return `found: false` with the message.
  - Slice gate: **PASS**. `pnpm gate` exited 0: typecheck, lint (0 errors), 245 tests, build and 72 smoke checks. The output is in `test-results/11-archive/gate.txt`.
- Deviations:
  - Link-only is data-driven, so 2021 qualifies too.
  - The Archive detail is the edition home of a complete War Week; there's no separate `/history/[edition]` route.
- Run: `docker compose up -d && pnpm build && pnpm smoke`, then `pnpm tsx scripts/archive-evidence.ts` (needs Google Chrome).
