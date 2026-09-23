# AC1 — fresh clone setup works (final evidence)

Commit under test: review-fix commit on top of dc4a83b (see PR head) · Environment: Docker Postgres 17, volume reset with `docker compose down -v`

Steps from README "Fresh clone setup", run in order:

```
## fresh setup from reset volume
 Network war-weeker_default  Removed
 Container war-weeker-postgres  Started
Using 'pg' driver for database querying
[⣷] applying migrations...[2K[1G[✓] migrations applied successfully!Loaded War Week xi
dev /xi -> 200
```

`pnpm install --frozen-lockfile` also succeeds against the committed lockfile ("Done in 500ms").
