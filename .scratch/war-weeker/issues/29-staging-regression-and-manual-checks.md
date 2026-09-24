# 29: Staging regression pass and Paul's manual checks

**What to build:** No code. First, Paul's manual steps that make staging and production demo-ready. Then a regression walk of staging in the desktop app's browser pane, which produces findings tickets. Modeled on journeys ticket 56. Run it twice to match Paul's checklist (round 1, apply feedback, round 2, apply feedback).

**Blocked by:** none for the manual steps. The regression rounds run after the hackathon batch (16, 20–28) has merged to `staging`. Round 1 can start at 17:00 on 2026-09-24 on whatever has merged.

**Status:** ready-for-human

## Manual steps (Paul)

- [ ] **Reset the seed on staging and production.** Run the Seed workflow with reset (`confirm_reset` = the environment name) once all seed-changing tickets (04 leftovers, 20's demo email, 22's Placement Points) have merged. The old keyed Awards (`mvp`, `spirit`) survive a plain reload. Warning: after ticket 25 lands, a reseed wipes any UI setup edits.
- [ ] **Check the guessed links.** Open a few past editions on staging and click the wiki link (`https://sites.google.com/jahnelgroup.com/jahnel-group-wiki/war-week-<year>` is an unverified pattern). Past years' Slack links go to the workspace root, so decide whether that's acceptable. Record broken years in Comments. The fix is a seed edit plus a reseed.
- [ ] **Set `MCP_TOKEN`** (ticket 21) in Vercel for staging and production and redeploy.
- [ ] Sign in inside the browser pane when the regression thread asks. The agent never enters credentials.

## Regression walk (agent, in the browser pane)

1. Signed in as Paul, both color schemes if the theme supports them, desktop and 375px: `/`, `/xi` home, Schedule, Leaderboard (team and individual), Competitions and one detail, Teams, News, Awards, FAQ, More, `/history` and two past editions, `/install`, `/llms.txt`, the splash/About (28).
2. Organizer flow: enter a Points Entry with a placement preset, edit it, delete it; hide standings, confirm hidden everywhere including MCP, run the Reveal, unhide; post an Announcement with an embedded video, pin it, delete it; create and delete an Award; one save on each setup screen, reverted afterwards; the "You" highlight and picker.
3. MCP: connect Claude Code with the token and call each tool once.
4. Every page: console errors, an axe scan (`axe-core` from a CDN via `javascript_tool`), text overflow at 375px.

**Deliverables:** a `[FINDINGS round N]` record in Comments, with each finding written as `severity — page — what happened — what was expected` and a screenshot under `test-results/29-regression-round-N/`. `blocks-promotion` covers anything a judge hits in the first two minutes, or data loss. `fix-tonight` covers visible copy and layout faults. `post-hackathon` covers the rest. Each finding in the top two severities becomes its own ticket numbered from 31. The thread fixes nothing itself. Everything created during the walk is deleted afterwards.

## Acceptance criteria

- [ ] The manual steps above are checked off by Paul.
- [ ] Round 1 findings are recorded and their tickets filed. Round 2 is the same, after round 1 fixes merge.
- [ ] Paul promotes `staging` → `main` and smokes production before 10:00 ET on 2026-09-25.

## Comments
