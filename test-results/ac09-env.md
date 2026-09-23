# AC9 — .env.example lists every variable the app reads (final evidence)

`grep -rhoE 'process\.env\.[A-Z_]+' src scripts drizzle.config.ts | sort -u`:
```
process.env.DATABASE_DRIVER
process.env.DATABASE_URL
```
Names in `.env.example`: DATABASE_URL, DATABASE_DRIVER, BETTER_AUTH_SECRET, BETTER_AUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ANTHROPIC_API_KEY — a superset of what is read.
