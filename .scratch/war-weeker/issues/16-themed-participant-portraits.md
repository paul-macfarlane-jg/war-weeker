# 16: Participant initials Avatars

**What to build:** Give every Participant an **Avatar**: a small circle with their initials in their Team's color. Show it on the Teams page roster, the individual leaderboard rows and the Award winners on `/awards`. No photos, no AI, no schema change. This is the deadline-sized slice of the original "themed portraits and bios" idea; the rest moved to ticket 19.

**Blocked by:** none

**Status:** done

## Decisions

Grilled 2026-09-24 with Paul.

- **Initials:** the first letter of the first word and the first letter of the last word of `displayName`, uppercased. One word gives one letter. No special cases for titles or particles ("Paul Macfarlane" → PM, "Cher" → C, "Sir Paul of the Backend" → SB).
- **Color:** the fill is the Participant's Team color. A Participant with no Team, or in a free-for-all War Week, gets the War Week's Appearance Theme primary color. The text is white or black, whichever has higher contrast against the fill.
- **Where:** the Teams page roster, the individual leaderboard (including during the Reveal, since those are the same rows) and Participant recipients on `/awards`. Team recipients of Awards get no Avatar. Admin pages are out of scope.
- The Avatar is decorative next to the visible name (`aria-hidden`), so screen readers don't read the initials twice.
- **Out of scope here:** photos, scraping jahnelgroup.com, AI restyling, bios, Organizer review. All of this is in ticket 19.

## Acceptance criteria

- [x] A pure function derives initials from a display name. Unit tests cover two words, one word, many words, extra whitespace, and lowercase input.
- [x] A pure function picks the Avatar colors (Team color, else the Appearance Theme primary color) and the higher-contrast text color. Unit tests cover a light fill and a dark fill.
- [x] One shared Avatar component is used on the Teams page roster, the individual leaderboard rows and Participant Award recipients.
- [x] Hidden Standings stay hidden: the individual leaderboard shows no Avatars or names while hidden (no new data reaches the client).
- [x] Screenshots of the Teams page, the individual leaderboard and `/awards` for the seeded demo War Week, at 390px wide, saved under `test-results/16-avatars/`.
- [x] `CONTEXT.md` defines **Avatar** and its display rule (done during grilling; keep it in sync if the implementation differs).
- [x] `pnpm gate` passes.

## Comments

- 2026-09-24 (Claude) [CLOSEOUT]: Implemented on `feat/16-avatars` in one session (Opus 5.5, no workers).
  - `src/lib/avatar.ts`: `initials` and `avatarColors` (reuses `contrastRatio` from `lib/theme`). 9 unit tests in `src/lib/avatar.test.ts`.
  - `src/components/avatar.tsx`: the shared `Avatar` (`aria-hidden`, 32px circle). Used by `RosterList`/`TeamRoster`, `IndividualStandingsList` (home page and `/leaderboard`, Reveal included) and Participant recipients on `/[edition]/awards`. Team recipients get no Avatar.
  - `AwardView.participants` now carries `teamColor` (left join on `team`). `IndividualStandingsList` shows Avatars only when it's given `primaryColor`, so the admin Points page stays unchanged.
  - Hidden Standings: no change to the data. `getStandings` still returns `{ hidden: true }`, and `phone-leaderboard-hidden.png` shows no rows.
  - `CONTEXT.md` already matches the implementation. No change made.
  - Evidence: `test-results/16-avatars/phone-{teams,leaderboard,leaderboard-hidden,awards}.png` at 390px, captured with `DATABASE_URL=<.env.example value> pnpm tsx scripts/avatars-evidence.ts`. The script restores XI's Standings visibility afterwards.
  - Verified: `DATABASE_URL=<.env.example value> pnpm gate` passed (typecheck, lint with 0 errors, 409 tests, build, smoke with 121 checks). The worktree has no `.env.local`.
- PR: https://github.com/paul-macfarlane/war-weeker/pull/36
- 2026-09-24 (Claude) [AI CODE REVIEW]: two-axis review against `origin/staging`.
  - Standards: no hard violations. The only finding was that the ticket wasn't `done` yet, which this closeout fixes. Judgement call: `primaryColor` is passed down three component layers, the same way `teamLabel`/`leaderTitle` already are. Kept.
  - Spec: all acceptance criteria are met. Possible scope creep: the checked-in `scripts/avatars-evidence.ts`. Kept, because it follows the repo's one-off evidence-script pattern (tickets 11 and 13). Judgement call: optional `primaryColor` is an implicit switch for showing Avatars. Kept and documented on the prop. Minor: the Teams shot sets Standings hidden, which is harmless.
