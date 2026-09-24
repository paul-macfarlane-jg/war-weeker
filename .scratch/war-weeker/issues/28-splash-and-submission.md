# 28: The splash / About page and the hackathon submission paragraph

**What to build:** A public, splashy `/about` page that explains War Weeker to Jason (COO) first, then Organizers, then Participants: what War Week is, the problem, the features, the history. Plus the submission paragraph set for the judges' Google form. Modeled on journeys ticket 54 (`../journeys/.scratch/journeys-platform/issues/54-about-page-and-submission.md` on `origin/staging`).

**Blocked by:** 20, 26, 27 (Paul, 2026-09-24: core features; the cards and stills should show them).

**Status:** ready-for-agent

Route: polish, plus a red-team for the public path (see decision 3).

## Decisions (Paul, 2026-09-24, grilled)

1. **The name stays "War Weeker".** No change to `src/lib/pwa.ts`, the manifest, `/install` or metadata.
2. **One new page, `/about`.** `/` keeps redirecting to the current edition, which Participants rely on during War Week. The form links `/about`. Link it from the More page (`src/app/[edition]/more/page.tsx`), `/sign-in` and the credit footer (`src/components/site-footer.tsx`).
3. **`/about` is public.** Add it to `PUBLIC_PREFIXES` in `src/lib/access.ts`. Judges do have JG accounts, but the first impression shouldn't be a sign-in wall. The page is static: copy, stills and video only, never live War Week data (no queries, nothing from a shared layout that reads the database or the session). The Google-only, `@jahnelgroup.com` restriction is untouched. `docs/agents/planning.md` requires a red-team for access-control changes, so run `/atlas-red-team` on the plan; the reviewer checks that no live data reaches the page and that prefix matching opens nothing else. Files in `public/` already bypass the proxy (`src/proxy.ts` matcher), so the media needs no access change. When it ships, update the `CONTEXT.md` access rule "Only `/sign-in` and `/api/auth/*` are public" to include `/about`.
4. **Readers, in order:** Jason (COO, runs War Week, and the person deciding whether War Weeker is how War Week runs from now on), then Organizers who run Competitions, then Participants. Use `CONTEXT.md` vocabulary: "Competitions", never "tournaments" or "events".
5. **The pitch.** Competiscore, which held the points, is gone, and ten years of history lived only in old wiki pages. War Weeker runs the whole week in one place, Organizers set it up with no code, and it's JG's to change. The page ends on "Open War Week XI" (`/xi`), plus a link to the maintainer's guide (`docs/maintainers-guide.md`, ticket 31) only if 31 has merged.
6. **Voice.** Product voice throughout, plus one short first-person section from Paul ("why I built this"): War Week has run every year since 2016 (XI in 2026); Competiscore held points until its data was lost; history lived only in old wiki pages; Organizers juggled spreadsheets, Slack and wikis.
7. **No build-tooling story on the page.** Nothing about Claude Code, Atlas or agents on `/about`; that's only in the judges' paragraph. The MCP connector is a product feature and stays in as a card.
8. **The six feature cards** (the Reveal is the video hero, not a card):
   1. **Organizer setup, no code:** War Week, Days, Teams, roster, Competitions, schedule, FAQ (25, 26, 27)
   2. **Points entry with Placement Points:** tap "1st · 5" (09, 22)
   3. **Schedule with Now / Next** on the ET clock (06)
   4. **Announcements** with video, also posted to Slack (12, 15, 23)
   5. **The Archive:** every War Week since 2016 in its own theme (11)
   6. **Ask Claude:** the MCP connector answers "who's winning?" (21)

   The "You" highlight (20), the installable app (14) and themed editions get one sentence each, not cards.
9. **Media come from a script, never hand screenshots.** `scripts/about-media.ts`, modeled on `scripts/reveal-evidence.ts` (headless Chrome against a production build on seeded local Postgres, signing in with a signed session cookie):
   - **Hero:** War Week XI's leaderboard at 390px, hidden, then Revealed, about 12 s, recorded through the CDP screencast and encoded by `ffmpeg` to `public/about/reveal.mp4`, plus `public/about/reveal-poster.png`. Shown in a phone frame beside the headline, looping and muted. With `prefers-reduced-motion`, show the poster instead.
   - **Stills:** one per card at `public/about/<slug>.png`. Admin stills sign in as a seeded Organizer. All in XI's Appearance Theme except the Archive still, which shows a different edition so the variety comes through.
   - If `ffmpeg` isn't on `PATH`, the script stops with "Install ffmpeg: brew install ffmpeg". The media are committed, so only the recording machine needs it.
   - Data is the seeded demo only: wiki names, no other real employee data.
10. **Visual style.** Large display type, the phone-frame hero, the six-card grid, a single entrance fade that respects `prefers-reduced-motion`. XI's Appearance Theme and existing type; no new dependency beyond what the recording script needs.
11. **No slideshow.** The page and the paragraph do the job.
12. **The paragraph set** is in Comments, approved by Paul at grilling. Nothing from it is published on the site.

## Acceptance criteria

- [ ] `/about` renders for an anonymous visitor at 390px and desktop in War Week XI's Appearance Theme: the hero video (poster, reduced-motion fallback), six feature cards with stills, Paul's story section, and "Open War Week XI".
- [ ] `/about` shows no live War Week data and makes no database or session read; it mentions no build tooling.
- [ ] `/about` is linked from the More page, `/sign-in` and the credit footer.
- [ ] Unit test: `isPublicPath("/about")` is true; `/aboutx` and `/about-anything` stay private.
- [ ] `pnpm smoke` gains an anonymous 200 on `/about`.
- [ ] `pnpm tsx scripts/about-media.ts` regenerates `public/about/reveal.mp4`, `reveal-poster.png` and the six stills.
- [ ] `CONTEXT.md` access rules list `/about` as public.
- [ ] The red-team review of the plan is recorded in Comments.
- [ ] Screenshot evidence (anonymous, 390px and desktop) in `test-results/28-splash/`.
- [ ] `pnpm gate` passes.

## Comments

### 2026-09-24 — grilled with Claude (Opus 5.5); decisions above

**Paragraph set (approved by Paul; he may edit it before submitting).**

Tagline:

> Run War Week in one place, and keep every year of it.

Short (about 50 words):

> War Weeker is where Jahnel Group runs War Week. Organizers set up each edition's theme, teams, schedule and Competitions with no code, enter points with one tap, and Reveal the hidden leaderboard live. Everyone else follows along on their phone, and the Archive brings back every War Week since 2016. https://war-weeker.vercel.app/about

Long (about 120 words):

> War Weeker is one place for Jahnel Group to run War Week and to remember it. Competiscore, which held our points, is gone, and ten years of history lived only in old wiki pages. War Weeker brings it together: organizers set up each edition's story, look, teams, schedule and Competitions with no code, enter points with placement presets, post Announcements that also land in Slack, and hide the Standings until a live, animated Reveal. Participants follow along in an installable phone app, with Now/Next on the schedule and their own team highlighted, or just ask Claude through the MCP connector. The Archive restores every War Week since 2016. I built it in a week with Claude Code and the Atlas plugin: grilled specs, tickets, and reviewed pull requests. https://war-weeker.vercel.app/about

Look at this first:

> - Watch the Reveal on /about, then open War Week XI's leaderboard and schedule on your phone (install it from /install).
> - Browse the Archive: every War Week since 2016, each in its own theme.
> - Add https://war-weeker.vercel.app/api/mcp to Claude as a connector and ask who won War Week VIII.

The third bullet needs `MCP_PUBLIC=true` in production during judging (ticket 21).

**Tonight's runbook:**

| Order | Who | What |
|---|---|---|
| 0 | Paul | `brew install ffmpeg` |
| 1 | thread | 20, 26, 27 (26 and 27 one after the other: both touch admin setup) |
| 2 | thread | 31 (maintainer's guide), in parallel with 1; first to cut |
| 3 | thread | 28 after 20, 26 and 27 merge: plan, red-team, recording script, then `/about` |
| 4 | thread / Paul | 29 regression on staging |
| 5 | Paul | Production is not seeded yet: from your own terminal (the URL is a secret, never in chat or `.env.local`), run `DATABASE_URL='<neon url>' pnpm seed:all` against production once its migrations are applied. Set `MCP_PUBLIC=true` in Vercel production. Promote `staging` → `main`, then smoke production (sign in, `/xi`, `/xi/leaderboard`, `/history`, `/about` in a private window, the MCP connector). |
| 6 | Paul | Submit the form: long paragraph, `/about` URL, the three bullets |
