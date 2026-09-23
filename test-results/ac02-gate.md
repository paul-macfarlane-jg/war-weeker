# AC: Slice gate (ticket 02)

- Commit: `017e56c` (`origin/main`, the commit deployed to production), run in a clean detached worktree
- Environment: local Docker Postgres 17 (`war-weeker-postgres`, :2345), `DATABASE_DRIVER=pg`
- Command: `pnpm gate` (= `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm smoke`)
- Run: 2026-09-23

Result: exit 0. Every smoke check printed `ok`: migrate, seed load twice → one War Week XI row, server ready, `/` → `/xi`, `/xi` renders XI, `/zz` 404, `/xi/leaderboard` responds, MCP `tools/list` includes `get_current_war_week`, `tools/call` returns edition `xi`. (The trailing `ELIFECYCLE ... 143` line is the smoke stopping its `next start` child with SIGTERM.)

CI on `main` for the same commit (lint, format:check, typecheck, migrate, test, build) and the Migrate workflow were green on GitHub Actions.

Verdict: PASS
