# 10: Hide and Reveal

**What to build:** An Organizer can hide the standings, then press Reveal at closing ceremonies. Every open home and leaderboard page, on the projector and on phones, notices the change on its next poll and plays the Reveal animation, with standings counting up in reverse rank order. MCP `get_leaderboard` returns real standings after the Reveal.

**Blocked by:** 05, 08

**Status:** done

**Notes:** Touches standings hidden/reveal logic, so red-team the plan (repo policy). MCP must return the hidden result whenever `standingsHidden` is on.

- [x] Admin has Hide and Reveal controls; the server actions check the organizer allowlist
- [x] A client that saw hidden standings and then gets revealed ones on a poll plays the Reveal animation once, in reverse rank order, counting totals up; a client that first loads after the Reveal just shows standings
- [x] Two open browsers animate within one poll interval of each other after the Reveal (screenshot evidence of before and after under `test-results`)
- [x] Hiding again returns every public page and MCP `get_leaderboard` to the hidden state
- [x] Smoke still checks that MCP `get_leaderboard` is hidden for the demo seed
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

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

### [RED TEAM] 2026-09-23

Fresh-context `atlas-red-team-reviewer`. No blocking findings: hidden reads skip queries, routes are force-dynamic, and `requireOrganizer` runs on the loaded row. The plan is amended to take in every should-fix item:

- Ties reveal together. The stagger steps through distinct ranks, not array index, and vitest has a tie case.
- Both leaderboards animate on one clock, each stepping through its own ranks. The total is capped under 10 s, so a poll never lands mid-reveal. An empty list shows "No points yet.", and the transition still counts as used.
- The requestAnimationFrame loop is cancelled on cleanup and when `hidden` flips back to true. New rows mid-animation just render with the props they carry.
- The root carries `data-reveal-started-at` when the animation starts. The evidence reads it over CDP, checks `prefers-reduced-motion` is off, waits one more poll to prove "plays once", and opens a third browser after the Reveal to prove "no animation on first load".
- Smoke also fetches `/xi` and `/xi/leaderboard` as RSC (`RSC: 1`) while hidden and asserts no `total` key leaks. Reveal checks run after the seed-hidden MCP check, and a `finally` restores the flag with direct SQL.
- The actions take no War Week id. They act on `getCurrentWarWeek()`, as `/admin` does (nit 8).
- CONTEXT.md notes that a locked phone doesn't poll, so it animates late or not at all after a reload (nit 10).

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, since `staging`), run on 8752755.

**Standards**
- Layering follows ADR 0001:
  - The action loads the War Week, calls `requireOrganizer`, runs the mutation, revalidates, and returns `{ ok }`. It never throws.
  - The mutation has the signature `(input, ctx, dbOrTx)`.
  - `src/lib/reveal.ts` is pure and was tested first. The clock lives in the hook.
- The CONTEXT.md vocabulary is used correctly, and no banned terms appear in new files.
- The evidence policy is followed: the previous work package's `test-results/` was cleared, and the evidence is committed with no secrets.
- Judgement calls:
  - `war-weeks.ts` imported `MutationContext` / `MutationResult` from `points-entries.ts`. **Fixed**: they moved to `src/mutations/types.ts`.
  - Mild Feature Envy: `revealed()` in `standings.tsx`. It has one caller, so it stays.
  - Mild Primitive Obsession: the controls' `run(action, confirmText)`. There are two call sites, so it stays.

**Spec**
- Nothing is missing. Each acceptance criterion is backed by smoke or by `reveal-evidence.txt` (3.7 s start spread, played once, a late loader doesn't animate).
- No scope creep. The evidence script and the smoke additions are the evidence and smoke steps the plan asked for.
- Nothing looks wrong:
  - Client state survives `router.refresh()`.
  - The 8 s cap keeps the Reveal inside one poll.
  - Hidden HTML and RSC payloads carry no totals, and rows not yet revealed render 0.
  - The actions take no client id and refuse non-Organizers.

### [CLOSEOUT] 2026-09-23

- Repository: `war-weeker`, branch `feat/10-hide-and-reveal`, PR into `staging` (URL in the PR itself).
- Deliverables, all by Claude Opus 5.5 (single session; a fresh-context red-team reviewer and two Sonnet review agents):
  - `src/lib/reveal.ts` with its tests.
  - `src/mutations/war-weeks.ts` with its DB test, and `src/mutations/types.ts`.
  - `src/actions/standings-visibility.ts`.
  - `/admin/standings`, its controls and the admin nav link.
  - The `HomeStandings` / `LeaderboardStandings` client components, and reveal support in the standings lists.
  - Smoke checks.
  - `scripts/reveal-evidence.ts`.
  - CONTEXT.md "Reveal rules".
- DoD:
  - Admin Hide and Reveal controls, with actions that check the allowlist: **PASS**. Smoke: `/admin/standings` shows Reveal to an Organizer and the refusal to a non-Organizer, and both actions refuse a JG non-Organizer without changing the flag.
  - Plays once in reverse rank order, counting up, and a late loader just shows Standings: **PASS**.
    - Vitest covers reverse order, ties, count-up, and the cap.
    - `reveal-evidence.txt`: "played once" in both browsers after another poll. The late browser has no `data-reveal-started-at` and shows Standings.
  - Two browsers animate within one poll interval: **PASS**. A projector (1440×900, `/xi/leaderboard`) and a phone (390×844, `/xi`), in separate headless Chrome instances, started 3.4 s and 7.0 s after the Reveal, a spread of 3.7 s. Before, mid and after screenshots are in `test-results/10-hide-and-reveal/`.
  - Hiding again returns the pages and MCP to hidden: **PASS**. Smoke `hideStandings as an Organizer returns /xi, /xi/leaderboard and MCP get_leaderboard to hidden`, with no digits in the MCP text and no totals in HTML or RSC.
  - Smoke still checks that MCP is hidden for the demo seed: **PASS**. The existing `MCP get_leaderboard(team|individual) returns the hidden result` checks run first, on the seed state.
  - Slice gate: **PASS**. `test-results/10-hide-and-reveal/gate.txt` ends with `gate exit status: 0`: 232 tests, build, and the full smoke. The review fix after it only moved types, and typecheck, lint and vitest were rerun and are green.
- Deviations:
  - The actions take no War Week id (red-team amendment).
  - Lists are aligned to end together, so first places land at the finale.
- Run: `pnpm build && pnpm smoke`, then `pnpm tsx scripts/reveal-evidence.ts` (needs Google Chrome).
