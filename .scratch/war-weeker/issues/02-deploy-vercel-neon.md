# 02: Deploy to Vercel + Neon

**What to build:** Anyone can open the deployed War Weeker URL (the one the demo QR code will point to) and see the themed War Week XI home, backed by a Neon Postgres seeded with the same data as local.

**Blocked by:** 01

**Status:** ready-for-agent

**Human prerequisites (developer does these first):**
- Create the Vercel project and Neon database, and put their env values in Vercel project settings and the gitignored `.env.local` (never committed; agents never read `.env*` files)
- Add the Google OAuth redirect `/api/auth/callback/google` for the Vercel domain (used by ticket 08)

- [ ] Migrations and the seed run against Neon through a documented command
- [ ] A push to `main` deploys on Vercel and the production build succeeds
- [ ] Smoke against the deployed URL: `/xi` and `/api/mcp` respond; the result is saved under `test-results`
- [ ] Deploy steps are documented in the README
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
