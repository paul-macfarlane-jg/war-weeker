# AC8 / AC11 — `pnpm gate` (typecheck, lint, vitest, build, smoke) — final evidence

Exit code 0. Lint: 2 accepted `@next/next/no-img-element` warnings (banner, logo), 0 errors.

```
✖ 2 problems (0 errors, 2 warnings)
 Test Files  4 passed (4)
      Tests  17 passed (17)
✓ Compiled successfully in 954ms
ok - pnpm seed:load seeds/xi.json (load 1)
ok - pnpm seed:load seeds/xi.json (load 2)
ok - loading the seed twice leaves one War Week XI row
ok - server ready
ok - GET / redirects to /xi
ok - GET /xi renders War Week XI
ok - GET /zz returns 404
ok - GET /xi/leaderboard responds
ok - MCP tools/list includes get_current_war_week
ok - MCP tools/call get_current_war_week returns edition xi
GATE_EXIT=0
```
