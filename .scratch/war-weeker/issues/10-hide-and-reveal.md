# 10: Hide and Reveal

**What to build:** An Organizer can hide the standings, then press Reveal at closing ceremonies. Every open home and leaderboard page, on the projector and on phones, notices the change on its next poll and plays the Reveal animation, with standings counting up in reverse rank order. MCP `get_leaderboard` returns real standings after the Reveal.

**Blocked by:** 05, 08

**Status:** plan-review

**Notes:** Touches standings hidden/reveal logic, so red-team the plan (repo policy). MCP must return the hidden result whenever `standingsHidden` is on.

- [ ] Admin has Hide and Reveal controls; the server actions check the organizer allowlist
- [ ] A client that saw hidden standings and then gets revealed ones on a poll plays the Reveal animation once, in reverse rank order, counting totals up; a client that first loads after the Reveal just shows standings
- [ ] Two open browsers animate within one poll interval of each other after the Reveal (screenshot evidence of before and after under `test-results`)
- [ ] Hiding again returns every public page and MCP `get_leaderboard` to the hidden state
- [ ] Smoke still checks that MCP `get_leaderboard` is hidden for the demo seed
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [EXECUTION PLAN] 2026-09-23

Owner: Claude Opus 5.5, single session, branch `feat/10-hide-and-reveal`. No schema change (`war_week.standings_hidden` exists).

1. **Lib** `src/lib/reveal.ts` (pure, vitest first):
   - `isRevealTransition(previousHidden, hidden)`: true only for `true → false`.
   - `revealTimeline(rowCount)`: stagger per row and count-up duration, with the total capped (~8 s) so a long individual list still finishes quickly.
   - `revealRow(rankIndex, rowCount, elapsedMs)`: `{ shown, progress }`. The last-ranked row starts first and first place last (reverse rank order).
   - `countUpTotal(total, progress)`: eased 0 → total, rounded to hundredths, exact at progress 1.
2. **Mutation** `src/mutations/war-weeks.ts` `setStandingsHidden(hidden, ctx, dbOrTx)`: updates only `ctx.warWeekId`'s row. DB test in a rolled-back transaction.
3. **Actions** `src/actions/standings-visibility.ts`: `hideStandings(warWeekId)` / `revealStandings(warWeekId)`. Load the War Week by id from the DB, `requireOrganizer` first, call the mutation, `revalidatePath` admin + `/<edition>` layout, and return `{ ok } | { ok: false, error }`.
4. **Admin** `/admin/standings` (enables the "Standings visibility" nav item): current state plus a Hide button, or a Reveal button with a confirm prompt. The overview copy links it.
5. **Public pages**: new client components `HomeStandings` and `LeaderboardStandings`, which always render at the same tree position whether hidden or not, so `router.refresh()` (AutoRefresh, 10 s) keeps their state. Each remembers the last `hidden` it saw. On a `true → false` transition it runs a requestAnimationFrame clock, and rows fade in from last place up while their totals count up. `TeamStandingsList` / `IndividualStandingsList` take an optional per-row display state. Initial load when visible means no animation; hidden again shows "Standings hidden 🔒". `prefers-reduced-motion` skips the animation. Hidden payloads carry no numbers (Standings is `{ hidden: true }`).
6. **MCP**: unchanged. It already reads `getStandings`, so it follows the flag on every call.
7. **Smoke** additions:
   - Both actions refuse a non-Organizer, and the flag doesn't change.
   - Organizer reveal: `/xi` and `/xi/leaderboard` show standings, and MCP `get_leaderboard` returns `hidden: false` with totals.
   - Organizer hide: both pages and MCP go back to hidden.
   - `/admin/standings` renders the controls for an Organizer and refuses a non-Organizer.
   - The original flag is restored in `finally`.
   - The existing seed-hidden MCP check stays.
8. **Evidence** `test-results/10-hide-and-reveal/`:
   - Two separate headless Chrome instances driven over CDP, with smoke-style session cookies, both on `/xi/leaderboard`.
   - Screenshots before the Reveal, mid-animation and after.
   - The recorded animation start times of both browsers, which must be less than 10 s apart.
   - `gate.txt` with the exit status.
9. CONTEXT.md gets "Reveal rules". The ticket moves to `done` in the final commit, with the AI review and closeout.
