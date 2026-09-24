# 34: Post-hackathon polish from regression round 1

**What to build:** The `post-hackathon` findings from ticket 29 round 1, bundled. Each is small; none blocks the demo. Split into separate tickets if someone picks one up alone.

**Blocked by:** none

**Status:** needs-triage

## Findings

- `/history`, `/x`, `/i` — axe color-contrast (serious): `text-foreground/60` labels on light edition cards (16 nodes on `/history`), the Survivor `.tracking-wide` label, War Week I's orange `text-primary` links. Expected ≥ 4.5:1. Consider `text-muted-foreground` once ticket 32 themes it.
- `/about` — the top bar shows "Sign in" to a signed-in user. Expected: hide it or show "Open War Week XI".
- `/xi/teams` — the team card shows a bare "50" (member count) with no label; while standings are hidden it reads like points. Expected: "50 members" or a `title`.
- `/admin/announcements` — the "Videos" column counts only the Video links list, so a post whose body embeds a video shows 0. Expected: count body embeds too, or rename the column "Video links".
- Points Entry delete confirm — "Delete 1 pts to Abby Rivera…". Expected: "1 pt".
- `/admin/setup/war-week` and `/admin/setup/days` — no visible confirmation after Save (Points Entry shows "Saved."). Expected: the same status line.
- README deploy section — names only production. The staging URL that accepts sign-in is `https://staging-war-weeker.vercel.app` (its Preview `BETTER_AUTH_URL`); the `war-weeker-git-staging-pauls-team.vercel.app` alias and per-deployment URLs answer 403 `INVALID_ORIGIN`. Expected: README names the staging URL; optionally `trustedOrigins` in `src/auth/server.ts` includes `VERCEL_BRANCH_URL` and `VERCEL_URL` so every alias signs in.
- `/about` hero video — paused on load in the desktop app's browser pane (autoplay, muted, loop are set and `.play()` works). Probably the pane's autoplay policy; confirm in a normal browser during the production smoke and close if it plays.

## Comments

**2026-09-24, Claude (implement, ticket 29):** Filed from the round 1 findings record in ticket 29. Evidence and per-page scan: `test-results/29-regression-round-1/round-1-notes.md`.
