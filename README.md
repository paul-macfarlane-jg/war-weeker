# war-weeker

War Week: themes, schedule, teams, competitions, points, awards, and
announcements for Jahnel Group's annual War Week, plus a curated War Week
history. See `CONTEXT.md` for the domain glossary.

## Fresh clone setup

Prerequisites: Node 24, `pnpm` via corepack (`corepack enable`), Docker
running locally.

```bash
cp .env.example .env.local   # fill in real values as later tickets need them
docker compose up -d          # starts local Postgres on localhost:2345
pnpm install
pnpm db:migrate
pnpm seed:load seeds/xi.json
pnpm dev                      # http://localhost:3000
```

Checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

<!-- atlas-v3:readme:start -->

## Atlas

This repo uses Atlas, a Claude Code plugin that acts as a shared path for AI-assisted development — generated, customizable policies, guidelines, and guardrails that keep agent-driven work safe and consistent without locking teams into one rigid workflow. Read [`docs/atlas-operators-guide.md`](./docs/atlas-operators-guide.md) for how to work in this repo, in plain language, and the **Atlas** section in [`CLAUDE.md`](./CLAUDE.md) for the policy the agents follow.

Everything Atlas generated here — hooks, the `CLAUDE.md` section, `docs/agents/` — is a **base recommendation**, not fixed policy. Adapt it to this project's actual needs and processes.
<!-- atlas-v3:readme:end -->
