# AC4 — routes (final evidence)

`pnpm build && pnpm start -p 3100` against seeded local Postgres:

```
/ -> 307 http://localhost:3100/xi
/xi -> 200 
/XI -> 200 
/zz -> 404 
/xi/leaderboard -> 200 
```
