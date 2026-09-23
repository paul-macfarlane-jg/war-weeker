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

## Smoke test and slice gate

`pnpm smoke` runs an end-to-end check against a production build: it applies
migrations, loads `seeds/xi.json`, starts the app with `pnpm start -p 3100`,
and asserts `/` redirects to `/xi`, `/xi` and `/xi/leaderboard` respond, and
`/api/mcp` answers `initialize`, `tools/list`, and a `tools/call` of
`get_current_war_week` with War Week XI's data. It prints one `ok - <check>`
or `FAIL - <check>: <detail>` line per assertion and exits 0 only if every
check passed.

Prerequisites: Docker Postgres running (`docker compose up -d`) and a fresh
production build (`pnpm build`) before running `pnpm smoke`.

`pnpm gate` runs the full slice gate used before every commit: type-check,
lint, vitest, production build, then the smoke test —
`pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke`.

### Connecting an MCP client

The app exposes a read-only Model Context Protocol server over Streamable
HTTP at `http://localhost:3000/api/mcp` (no authentication). It currently
exposes one tool, `get_current_war_week`, which returns the current War
Week (live, else the most recent upcoming, else the most recent complete).
Point any Streamable HTTP MCP client at that URL, e.g.:

```json
{
  "war-weeker": {
    "url": "http://localhost:3000/api/mcp"
  }
}
```

## Deployed migrations

`.github/workflows/migrate.yml` runs `pnpm db:migrate` on every push to
`staging` (against the `STAGING_DATABASE_URL` repo secret) and `main`
(against `PROD_DATABASE_URL`). A branch whose secret is unset logs a notice
and skips. Generate migrations locally with `pnpm db:generate` and commit the
`drizzle/` output; never run `db:migrate` by hand against a deployed database.

Seeds are never loaded on deploy. To load them, run the **Seed** workflow from
the Actions tab: pick `staging` or `production` and optionally one file under
`seeds/` (blank loads all). Production can only be seeded from `main`.

<!-- atlas-v3:readme:start -->

## Atlas

This repo uses Atlas, a Claude Code plugin that acts as a shared path for AI-assisted development — generated, customizable policies, guidelines, and guardrails that keep agent-driven work safe and consistent without locking teams into one rigid workflow. Read [`docs/atlas-operators-guide.md`](./docs/atlas-operators-guide.md) for how to work in this repo, in plain language, and the **Atlas** section in [`CLAUDE.md`](./CLAUDE.md) for the policy the agents follow.

Everything Atlas generated here — hooks, the `CLAUDE.md` section, `docs/agents/` — is a **base recommendation**, not fixed policy. Adapt it to this project's actual needs and processes.
<!-- atlas-v3:readme:end -->
