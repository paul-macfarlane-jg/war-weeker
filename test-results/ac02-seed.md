# AC2 — seed loader validates with zod and upserts by edition (candidate evidence)

Commit: fec8743 · Environment: local Docker Postgres 17 (`war-weeker-postgres`, :2345)

```
$ pnpm seed:load seeds/xi.json && pnpm seed:load seeds/xi.json
Loaded War Week xi
Loaded War Week xi
$ psql ... -At -c "select count(*) from war_week" -c "select edition,status,standings_hidden from war_week" -c "select count(*) from day"
1
xi|live|t
6
```

Invalid-seed rejection: `src/seed/schema.test.ts` (5 rejection cases) — see ac03 output, 13/13 tests pass.
