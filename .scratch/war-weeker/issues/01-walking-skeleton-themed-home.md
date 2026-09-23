# 01: Walking skeleton: themed War Week home

**What to build:** A participant opens `/` or `/xi` on a phone, with no sign-in, and sees War Week XI's edition, Story Theme, banner and one prominent Slack channel button. The page is styled in XI's Appearance Theme and has a bottom tab bar (Home · Schedule · Leaderboard · News · More). A Claude user can call `get_current_war_week` on the read-only MCP server at `/api/mcp`. This ticket stands up the new codebase and the whole pipeline end to end: scaffold, local Postgres, a minimal War Week + Day schema, a validated seed loaded by edition, the read model, a themed page, the MCP endpoint and the smoke test. Later slices extend each layer.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Notes:**
- Stack per spec: Next.js App Router, TypeScript, Tailwind, shadcn (base-nova / Base UI), Drizzle, Postgres (Docker locally), zod, vitest, pnpm. Copy the DB client (prod/local driver switch, `DBOrTx`) and coding conventions (text-length limits in both DB and zod, server actions for writes) from Competiscore.
- The War Week entity carries the fields from the spec, including status, mode, Team Label, Leader Title, Slack URL, `standingsHidden`, Appearance Theme fields, wiki URL and organizer emails, because later slices depend on them.
- Changes the Drizzle schema, so red-team the plan (repo policy).

- [ ] Fresh clone setup is documented and works: install, start Docker Postgres, migrate, load the seed, run the dev server
- [ ] The seed loader validates a War Week seed file with zod and upserts it by edition in one transaction; loading it twice leaves one War Week
- [ ] The current War Week resolves as `live`, else the most recent `upcoming`, else the most recent `complete`, never from the clock; covered by a vitest test through the public query
- [ ] `/` renders the current War Week; `/xi` renders War Week XI; an unknown edition returns 404
- [ ] The home page shows edition, Story Theme, banner and the Slack channel button, themed via CSS variables from the War Week's Appearance Theme (colors, logo, banner, one of 2–3 font presets)
- [ ] The mobile bottom tab bar is present; tabs for pages that don't exist yet may be placeholders
- [ ] `/api/mcp` (Streamable HTTP, no auth, read-only) exposes `get_current_war_week`
- [ ] The smoke script loads the seed into local Postgres, starts the app, and checks that `/xi` and `/api/mcp` respond; later slices add to it
- [ ] `.env.example` lists every variable name the app uses
- [ ] The domain glossary from the spec is in CONTEXT.md; banned terms (Event, League, Member, Match, ELO, Placeholder, Tournament) are absent from code
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
