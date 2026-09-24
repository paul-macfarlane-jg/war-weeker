# 21: Let MCP clients connect again

**What to build:** Since ticket 08, `/api/mcp` needs a browser session, so Claude Code, Claude Desktop and claude.ai can't connect. Add a machine-friendly way in so the MCP can be shown to judges.

**Blocked by:** none

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24. Paul said: "MCP auth fix, or just make it public temporarily if it is too hard." Confirm at the start of `/implement`.

- **Bearer token (the default, and the main fix).** `/api/mcp` accepts either a JG session (today's behavior) or `Authorization: Bearer <MCP_TOKEN>`, where `MCP_TOKEN` is a server-only env var compared in constant time. If it's unset or blank, token auth is off. Add it to `.env.example` with an empty value. This covers Claude Code and any client that can send headers:
  `claude mcp add --transport http war-weeker https://<host>/api/mcp --header "Authorization: Bearer <token>"`
- **Public escape hatch.** `MCP_PUBLIC=true` makes `/api/mcp` open with no auth. It's for a claude.ai connector demo, since custom connectors there support only OAuth or no auth. It's off by default. When on, the README and this ticket must say that every MCP tool is read-only and returns only what a signed-in participant sees: hidden standings stay hidden, and there are no emails. The implementer checks that no tool returns Participant emails or organizer lists before this flag is allowed.
- **Out of scope:** OAuth / dynamic client registration (post-hackathon; better-auth 1.7.5 has no MCP OAuth plugin).
- The check lives in the one `/api/mcp` branch of `src/proxy.ts`, with a pure helper in `src/lib/access.ts`. Every other route is unchanged.

## Acceptance criteria

- [ ] A pure helper decides MCP access from (has JG session, auth header, `MCP_TOKEN`, `MCP_PUBLIC`). Unit tests cover session only, a correct token, a wrong token, a token when `MCP_TOKEN` is unset, and public on/off.
- [ ] Smoke: anonymous `/api/mcp` still gets 401 by default. With `MCP_TOKEN` set in the smoke env, a bearer request completes an MCP `initialize` and a `get_current_war_week` call.
- [ ] An audit note in Comments confirms that no MCP tool output contains an email or the organizer allowlist.
- [ ] The README has a "Connect Claude to War Weeker" section covering Claude Code with the token, and claude.ai with `MCP_PUBLIC`. The spec's MCP section, CONTEXT.md "Access rules" and `docs/agents/planning.md` (team-owned; flag the edit in the PR) are updated.
- [ ] `pnpm gate` passes.
- [ ] Human step (Paul): set `MCP_TOKEN` in Vercel for staging and production, redeploy, and run the `claude mcp add` command above against staging.

## Comments
