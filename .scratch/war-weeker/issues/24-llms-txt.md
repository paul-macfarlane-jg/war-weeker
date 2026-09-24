# 24: `llms.txt`

**What to build:** A static `/llms.txt` that tells AI agents what War Weeker is, what the pages are, and how to connect to the MCP server.

**Blocked by:** none (it reads better after 21 lands, but only the MCP paragraph depends on 21 and can name the header without it)

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24. Confirm at the start of `/implement`.

- A route handler at `src/app/llms.txt/route.ts` returns `text/plain`. The proxy matcher already skips paths with an extension, so it's public. Because of that it contains **no War Week data**: no names, points, schedule or emails. It's static copy only.
- Follow the llmstxt.org shape: an H1 name, a one-line summary blockquote, then sections for "Pages" (the route list with a one-line purpose each, noting that sign-in is required), "MCP" (the endpoint, each tool with its one-line description, generated from the same tool definitions if that's cheap, else listed by hand plus a unit test that the list matches the registered tools), "Access" (JG sign-in, bearer token per ticket 21) and "Source" (the repo link from the credit footer).

## Acceptance criteria

- [ ] `GET /llms.txt` returns 200 `text/plain` anonymously. Smoke covers it.
- [ ] Every registered MCP tool name appears in it, and a test enforces this.
- [ ] It contains no data from the database.
- [ ] The spec stretch item 5 is marked delivered.
- [ ] `pnpm gate` passes.

## Comments
