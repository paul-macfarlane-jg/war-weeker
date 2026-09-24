# 21: Let MCP clients connect again

**What to build:** Since ticket 08, `/api/mcp` needs a browser session, so Claude Code, Claude Desktop and claude.ai can't connect. Add a machine-friendly way in so the MCP can be shown to judges.

**Blocked by:** none

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24. Paul said: "MCP auth fix, or just make it public temporarily if it is too hard." Confirm at the start of `/implement`.

- **Bearer token (the default, and the main fix).** `/api/mcp` accepts either a JG session (today's behavior) or `Authorization: Bearer <MCP_TOKEN>`, where `MCP_TOKEN` is a server-only env var compared in constant time. If it's unset or blank, token auth is off. Add it to `.env.example` with an empty value. This covers Claude Code and any client that can send headers:
  `claude mcp add --transport http war-weeker https://<host>/api/mcp --header "Authorization: Bearer <token>"`
- **Public escape hatch.** `MCP_PUBLIC=true` makes `/api/mcp` open with no auth. It's for a claude.ai connector demo, since custom connectors there support only OAuth or no auth. It's off by default. When on, the README and this ticket must say that every MCP tool is read-only and returns only what a signed-in participant sees: hidden standings stay hidden, and there are no emails. The implementer checks that no tool returns Participant emails or organizer lists before this flag is allowed.
- **Out of scope:** OAuth / dynamic client registration (post-hackathon; better-auth 1.7.5 has no MCP OAuth plugin).
- The check lives in the one `/api/mcp` branch of `src/proxy.ts`, with a pure helper in `src/lib/access.ts`. Every other route is unchanged.

## Acceptance criteria

- [x] A pure helper decides MCP access from (has JG session, auth header, `MCP_TOKEN`, `MCP_PUBLIC`). Unit tests cover session only, a correct token, a wrong token, a token when `MCP_TOKEN` is unset, and public on/off.
- [x] Smoke: anonymous `/api/mcp` still gets 401 by default. With `MCP_TOKEN` set in the smoke env, a bearer request completes an MCP `initialize` and a `get_current_war_week` call.
- [x] An audit note in Comments confirms that no MCP tool output contains an email or the organizer allowlist.
- [x] The README has a "Connect Claude to War Weeker" section covering Claude Code with the token, and claude.ai with `MCP_PUBLIC`. The spec's MCP section, CONTEXT.md "Access rules" and `docs/agents/planning.md` (team-owned; flag the edit in the PR) are updated.
- [x] `pnpm gate` passes.
- [ ] Human step (Paul): set `MCP_TOKEN` in Vercel for staging and production, redeploy, and run the `claude mcp add` command above against staging.

## Comments

**2026-09-24, Claude (implement):** Built as decided: bearer token (`MCP_TOKEN`, constant-time, off when blank) plus `MCP_PUBLIC=true` (off by default). Helper `canUseMcp` in `src/lib/access.ts`; the check lives in the `/api/mcp` branch of `src/proxy.ts`.

**MCP audit (required before `MCP_PUBLIC` is allowed).** Every MCP tool is read-only and returns only what a signed-in Participant sees; hidden Standings stay hidden. Checked each serializer in `src/mcp/*.ts`: every one lists its fields explicitly. `get_current_war_week` omits `organizerEmails`; `get_leaderboard`, `get_awards` and `get_history` return Participants by display name and Teams by name and color; `get_schedule`, `get_faq` and `list_history` carry no email fields. **One leak found and fixed:** `get_announcements` returned the author's email; it now returns the handle before the `@` (test updated). Caveats: a handle plus `@jahnelgroup.com` gives the email back, and authors are usually Organizers, so handles partly show who organizes. Emails typed by hand into free text (host, descriptions, FAQ answers, Announcement bodies) are content, not code, and would still show.

Gate: `pnpm gate` passes (334 unit tests; smoke covers anonymous 401, wrong bearer 401, and bearer `initialize` + `get_current_war_week` with no session). Remaining human step: set `MCP_TOKEN` in Vercel (staging + production), redeploy, and run the `claude mcp add` command against staging.
