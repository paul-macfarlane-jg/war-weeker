# Ticket 29 · regression round 1 · staging

Walked on 2026-09-24 16:00–17:00 ET against `https://staging-war-weeker.vercel.app`
(Vercel Preview of `staging` 14693a7; `main` carries the same commits via PR #44),
signed in as pmacfarlane@jahnelgroup.com in the desktop app's browser pane.
Pane viewport 812×994 ("desktop") and the 375×812 mobile preset. The app has
one color scheme (no theme toggle), so "both schemes" did not apply.

The pane cannot write files, so the PNGs here were reproduced locally by
`scripts/regression-29-evidence.ts` (same code, local seeded Postgres, CDP
headless Chrome). Every number below was measured on staging first.

## Per-page scan (axe-core 4.10.2 violations, horizontal overflow, nowrap text clipping, console errors)

| Page | 812px overflow | 375px overflow | axe violations | Notes |
|---|---|---|---|---|
| `/` → `/xi` | 20px (nav "Sign out") | 0 | none | pinned card + embed render |
| `/xi/schedule` | 20px | 0 | none | |
| `/xi/leaderboard` | 20px | 0 | none | hidden lock while standings hidden; both boards after Reveal |
| `/xi/competitions` + detail | 20px | 0 | none | detail shows "Points hidden" while hidden |
| `/xi/teams` | 20px | 0 | none | bare "50" = member count, unlabeled |
| `/xi/news` | 20px | 0 | none | |
| `/xi/awards` | 20px | 0 | none | |
| `/xi/faq` | 20px | 0 | none | accordion opens |
| `/xi/more` | 20px | 0 | none | |
| `/history` | 0 | 0 | color-contrast ×16 (serious) | `text-foreground/60` on light cards |
| `/x` (Survivor) | 0 | 0 | color-contrast ×1–5 (serious) | `.tracking-wide`, muted schedule link |
| `/i` (2016) | 0 | — | color-contrast ×5 (serious) | orange `text-primary` links |
| `/install` | 0 | — | none | |
| `/llms.txt` | — | — | — | plain text, lists pages and MCP |
| `/about` | 0 | 0 | none | shows "Sign in" while signed in; hero video paused in the pane (autoplay muted; plays on `.play()`), likely a pane autoplay policy |
| `/admin/*` | see findings | — | none | Teams & roster 400px overflow at 812 |

No console errors came from the app on any page (the seven errors in the
pane's console were this walk's own probes: 403s from the git-staging alias
sign-in and ERR_BLOCKED_BY_CLIENT from a blocked localhost save bridge).
No nowrap text clipping at 375px on any page.

## Organizer flow (all PASS, everything created was deleted)

- Points Entry: Settlers of Catan → Abby Rivera, "2nd · 3" preset filled 3, saved ("Saved.", Blue 20→23); edited via "3rd · 1" (Blue 21, row marked "edited"); deleted (Blue 20). Presets appear only for Competitions with Placement Points (Settlers of Catan, Beyblades); none for Cypher.
- Standings: hidden → `/xi`, `/xi/leaderboard`, competition detail and MCP `get_leaderboard` all report hidden. Reveal (confirm) → visible on the admin page, the open participant leaderboard tab refreshed within ~10 s and showed both boards, MCP returned totals. Hide standings → hidden again everywhere incl. MCP.
- Announcement: posted "REGRESSION-29 test announcement" with body text + embedded YouTube video (toolbar Video → URL popover → Insert video), pinned; `/xi` pinned card showed the `youtube-nocookie` iframe; Unpin, then Delete (confirm). Admin list "Videos" column showed 0 for the embedded video.
- Award: "REGRESSION-29 test award" → Abby Rivera; shown on `/xi/awards`; deleted (confirm).
- Setup, one save each, reverted: War Week (Leader Title "Captain" → "Captain (r29)" → "Captain", public Teams page followed), Days (day 2 theme), Teams & roster (Team "Red" name), Competitions ("Beast Mode Workout" name), Schedule ("Breakfast: Bagels" title via the edit page), FAQ (↓ then ↑ on item 1; public order followed).
- "You": email match highlights "Paul Macfarlane · You" on `/xi/teams`; no picker shown (by design). The picker itself was not exercised (needs an unmatched account).
- MCP: all 8 tools called once through the browser session (`initialize`, `tools/list`, `get_current_war_week`, `get_leaderboard` team/individual, `get_schedule`, `get_announcements`, `get_awards`, `get_faq`, `list_history`, `get_history {year: 2025}`). The Claude Code bearer-token path was not run: `MCP_TOKEN` in Vercel is Paul's step.

## Native dialogs

Delete, Reveal and Hide use `window.confirm`; the pane swallows native dialogs, so the walk patched `confirm` to return true and recorded the prompt text. Copy seen: "Delete 1 pts to Abby Rivera in Settlers of Catan?", "Reveal the Standings? Every open home and leaderboard page plays the Reveal on its next refresh.", "Hide the Standings on the public site and in Claude?".
