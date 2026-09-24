# 31: Vibe coder's maintenance guide for Jason

**What to build:** A guide that lets Jason (COO, runs War Week, a former developer) change War Weeker himself with Claude Code: set up, make a change, check it, ship it, and leave the repo no worse than he found it.

**Blocked by:** none. It reads best after 20–28 merge, so the recipes match the final app. Write it before the Fri 2026-09-25 10:00 AM submission.

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24. Confirm at the start of `/implement`.

- **Where it lives:** `docs/maintainers-guide.md`, linked from the top of `README.md` and from `CLAUDE.md` (one line), so Claude finds it when Jason asks for help.
- **Reader:** someone who can read TypeScript and use git but doesn't know Next.js App Router, Drizzle or this repo. He works by asking Claude Code and reviewing the result.
- **Atlas is highly recommended:** the guide leads with the Atlas route from `CLAUDE.md` (`/implement` for small changes; `/grill-with-docs` → `/to-spec` → `/atlas-implement` for features), how to install the Atlas plugin, and links `docs/atlas-operators-guide.md`. Plain Claude Code gets a short fallback section for when Atlas isn't available.
- **Voice:** short, task-first, copy-paste commands. No architecture essay. Link to `README.md` for setup detail instead of duplicating it.

## Scope

1. **Access checklist:** what Jason needs to be granted (GitHub repo, Vercel project, Neon, the Google OAuth / organizer allow-list, Slack app if 15 shipped) and who grants it. Name the variables from `.env.example` only, never values.
2. **The map:** a one-screen "where things live" table (pages, admin screens, schema, seeds, theme, MCP tools, smoke), plus the terms from `CONTEXT.md` he'll see in code.
3. **The loop:** branch from `staging` (`feat/…`, `fix/…`), ask Claude, run `pnpm dev` to look, run `pnpm gate`, open a PR into `staging`, check the Vercel preview, merge, then promote `staging` → `main` by PR. Say plainly: never commit to `staging` or `main`.
4. **Recipes with prompts to give Claude:** copy/text changes; a new theme or edition (organizer screens first: most War Week changes need no code); adding a field (schema → `pnpm db:generate` → migration → seed → UI); a new page; a new MCP tool; history content from `old-wikis/`.
5. **Guardrails:** don't read or paste `.env*` files; migrations against prod only through the deploy path; the gate must pass; what to do when the gate or a deploy fails (ask Claude to diagnose with the error output, or roll back the Vercel deployment).
6. **Getting unstuck:** who to ping (Paul), and a "ask Claude this first" list.

## Acceptance criteria

- [ ] `docs/maintainers-guide.md` exists and is linked from `README.md` and `CLAUDE.md`.
- [ ] Every command in it exists in `package.json` or the README; every file path in it exists.
- [ ] It contains no secrets or env values.
- [ ] A fresh Claude Code session given only "Jason wants to change X" finds and follows the guide (spot-check one recipe).
- [ ] `pnpm format:check` passes.

## Comments
