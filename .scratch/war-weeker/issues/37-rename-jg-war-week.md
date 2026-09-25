# 37: Rename War Weeker to JG War Week

Status: done

**What to build:** Rename the product from "War Weeker" to "JG War Week", matching "the JG Stairs app". User-facing branding first.

## Decisions

- Display name `JG War Week` (fits the iOS home-screen label); prose that starts a sentence or could be read as the event says "the JG War Week app".
- Favicon / PWA icons unchanged: the "WW" shield still reads as War Week.
- Full URL switch to `jg-war-week.vercel.app` (staging `jg-war-week-staging.vercel.app`); GitHub repo renamed to `paul-macfarlane/jg-war-week`.
- MCP server name and `claude mcp add` example become `jg-war-week`.
- Internal identifiers stay: package name, `war_weeker` DB, compose, CI, `.scratch/war-weeker/`, Atlas ids, historical tickets.

## Acceptance criteria

- [x] No "War Weeker" in `src/`, `scripts/`, `public/`, README or current docs.
- [x] Tab titles, manifest, iOS title, sign-in, about, privacy, terms, install, llms.txt, MCP name show the new name.
- [x] `ask-claude.png` regenerated with the new MCP name.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass (549 tests; stale `.claude/worktrees` excluded locally).

## Out-of-repo (owner: Paul)

Vercel project/domains + `BETTER_AUTH_URL`, Google OAuth consent name + redirect URIs/origins, GitHub repo rename + local remote.
