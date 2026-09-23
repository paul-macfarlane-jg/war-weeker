# 02: Deploy to Vercel + Neon

**What to build:** Anyone can open the deployed War Weeker URL (the one the demo QR code will point to) and see the themed War Week XI home, backed by a Neon Postgres seeded with the same data as local.

**Blocked by:** 01

**Status:** done

**Human prerequisites (developer does these first):**
- [x] Create the Vercel project and Neon database, and put their env values in Vercel project settings and the gitignored `.env.local` (never committed; agents never read `.env*` files)
- [x] Add the Google OAuth redirect `/api/auth/callback/google` for the Vercel domain (used by ticket 08)

- [x] Migrations and the seed run against Neon through a documented command
- [x] A push to `main` deploys on Vercel and the production build succeeds
- [x] Smoke against the deployed URL: `/xi` and `/api/mcp` respond; the result is saved under `test-results`
- [x] Deploy steps are documented in the README
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [CLOSEOUT] 2026-09-23

Human prerequisites done by the developer: Vercel project connected to the repo, Neon production and staging databases, env values in Vercel and GitHub secrets (`PROD_DATABASE_URL`, `STAGING_DATABASE_URL`), and the Google OAuth redirect for the Vercel domain.

Delivered on `main` via PRs #2 and #4 (CI, Migrate and Seed workflows) plus the README deploy section.

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| 1 | Migrations and seed run against Neon through a documented command | PASS | Migrate workflow runs `pnpm db:migrate` on push to `staging`/`main`; Seed workflow (manual) loads `seeds/`. Both green on 2026-09-23 (Migrate on `main`; Seed on `main` → production and `staging` → staging). Documented in README "Deployed migrations" |
| 2 | Push to `main` deploys on Vercel and the production build succeeds | PASS | GitHub deployment `Production` for `017e56c` → `success`; https://war-weeker.vercel.app serves it |
| 3 | Deployed smoke: `/xi` and `/api/mcp` respond, saved under `test-results` | PASS | `test-results/ac02-deployed-smoke.md` |
| 4 | Deploy steps documented in README | PASS | README "Deployment (Vercel + Neon)" and "Deployed migrations" |
| 5 | Slice gate | PASS | `test-results/ac02-gate.md` — `pnpm gate` exit 0 on `017e56c` |

Open item carried from 01: `seeds/xi.json` Slack URL is still a stand-in, and production now serves it.

