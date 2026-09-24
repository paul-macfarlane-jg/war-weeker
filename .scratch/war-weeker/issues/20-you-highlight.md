# 20: "This is you": account linking and the "Which one is you?" picker

**What to build:** A signed-in person sees themselves highlighted on the Teams page roster and the individual leaderboard. First the app tries **account linking**: the session email is matched, ignoring case, to a Participant email in the War Week being viewed. When that finds nobody (the Participant has no email, or it's a different address), a **"Which one is you?"** picker lets the person choose themselves from the roster. The choice is stored in `localStorage` for each War Week. Spec stretch items 1 and 2 are combined here because they drive the same highlight.

**Blocked by:** 16 (it touches the same roster and leaderboard rows; branch from `staging` after 16 merges)

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24 from the spec's stretch list; Paul prioritized it for the hackathon. Confirm or adjust at the start of `/implement`.

- **The email match wins.** When the session email matches a Participant, that Participant is "you". The picker isn't shown, and a stored pick is ignored.
- **The picker:** a small "Which one is you?" control on the Teams page, a searchable select of this War Week's Participants, with "Not me / clear" to undo. The stored key is `ww:you:<edition>` and holds the Participant id. An id that doesn't exist in the War Week is dropped silently. All `localStorage` access is wrapped in try/catch.
- **The highlight:** the row gets a visible "You" tag and a ring or background in the Appearance Theme accent, with the Avatar from 16 kept. It appears on the Teams roster, the individual leaderboard (and the Reveal), and Participant Award recipients on `/awards`.
- **Hidden Standings stay hidden.** No highlight appears while hidden, and no new standings data reaches the client.
- There is no schema change, and linking writes nothing to the DB. It's a read-time match only. Organizers are not affected.
- Past editions work the same way, using that edition's roster.

## Acceptance criteria

- [x] A pure function resolves "you" from (session email, Participants, stored id), with the email match first. Unit tests cover the email match (case-insensitive), no match with a valid stored id, a stale stored id, and neither.
- [x] A signed-in user whose email is on the seeded roster sees "You" on the roster and the individual leaderboard with no picker. A seeded demo Participant needs an email that matches the smoke user so this can be proved.
- [x] A user with no match can pick themselves, reload and still be highlighted, then clear the pick.
- [x] Nothing is highlighted while standings are hidden.
- [x] Screenshots at 390px of the roster and leaderboard with a highlight, and of the picker, under `test-results/20-you-highlight/`.
- [x] `CONTEXT.md` defines **You** / account linking. The spec's Out of Scope stretch list marks items 1–2 as delivered.
- [x] `pnpm gate` passes.

## Comments

### [SCOPE CHANGE] 2026-09-24 — demo email (approved by Paul at the start of `/implement`)

The seed gives XI's "Paul Macfarlane" `pmacfarlane@jahnelgroup.com`, so the live demo links Paul's own sign-in. That address already appears in the seeds as `enteredByEmail`. No smoke address goes into the seeds. Instead, the smoke gives Anthony Conway (who is on the roster, has individual points and holds an Award) `smoke-you@jahnelgroup.com` for the length of the check and restores it in a `finally`. How "Nothing is highlighted while standings are hidden" was read: it applies to Standings, where the hidden leaderboard renders only the lock, so no rows and no data reach the client. The Teams roster still highlights "You" while hidden because it isn't standings data. The spec reviewer agreed with this reading.

### [AI CODE REVIEW] 2026-09-24 — two axes against `origin/staging`, spec = this ticket

**Standards**
- Hard: the Status was still `in-progress`. Fixed: set to `done` in this commit.
- Judgement: "match" wording vs the banned term Match→Competition. Not changed: that ban is about the domain sense, and the non-domain use has precedent in `lib/video.ts`.
- Judgement: `YOU_ROW_CLASS` is a class string in `src/lib/`. Kept: it can't live in the `"use client"` module, because server components then receive a client reference (this bug appeared in the first evidence run).
- Judgement: `resolveYou` is called with half its inputs null at each site. Kept: the AC asks for one pure function over (email, Participants, stored id).
- Duplicated types and literal. Fixed: `getYouCandidates` returns `YouCandidate[]`, `YouPicker` takes `Pick<RosterParticipant, …>`, and smoke imports `YOU_ROW_CLASS`.
- Judgement: a `YouRow` wrapper. Not done: there are only three sites.

**Spec**
- The Status was not done. Fixed.
- The diff deletes `test-results/16-*`, `26-*` and `27-*`. This is intended: `docs/agents/testing.md` says to clear the whole proof root for each work package.
- The picker picked while typing, so "Alex" would pick before "Alex Kelly" was finished. Fixed: only a datalist choice (no typing `inputType`), Enter or blur picks. The evidence script checks that typing "Jory" picks nobody.
- The home page and the Reveal aren't covered by the linked-flow smoke. Not added: they render the same `IndividualStandingsList`, which is covered on `/leaderboard`.
- Verified sound: hydration (a stored pick is null on the server, a linked highlight is SSR'd), emails never reach the client (only the matched id), every storage access is in try/catch, a stale id is dropped, past editions and admin are unaffected.

### [CLOSEOUT] 2026-09-24

- Repository: `war-weeker`, branch `feat/20-you-highlight`, base `staging`. Delivered in the main session (Claude Opus 5.5) with no workers.
- What was delivered:
  - `src/lib/you.ts`: `resolveYou` (email first, then a valid stored pick), `youStorageKey`, `parseStoredYou`, `YOU_ROW_CLASS`, with 9 unit tests.
  - `src/components/you.tsx`: `YouProvider` (`useSyncExternalStore` over `localStorage`), `YouTag` and `YouPicker`.
  - Account linking runs server-side in `[edition]/layout.tsx` through `getYouCandidates`.
  - The highlight appears on the roster, the individual leaderboard (home, `/leaderboard`, the Reveal) and Award recipients.
  - `rosterParticipants`, with tests.
  - The seed email for Paul Macfarlane.
  - A smoke check, `assertYouHighlight`.
  - `scripts/you-evidence.ts`.
  - CONTEXT.md now defines **You** and **Account linking**, and the spec marks stretch items 1–2 as delivered.
- Definition of Done:
  - Pure function and unit tests: PASS (`src/lib/you.test.ts`, 9 tests).
  - Seeded or linked user sees "You" on the roster and leaderboard with no picker: PASS. Smoke `assertYouHighlight`, `test-results/20-you-highlight/gate-output.txt`.
  - Pick, reload, still highlighted, clear: PASS. `test-results/20-you-highlight/you-evidence-output.txt` (17/17 ok).
  - No highlight while standings are hidden: PASS. Smoke, the evidence output and `phone-leaderboard-hidden.png`.
  - Screenshots at 390px: PASS. `test-results/20-you-highlight/phone-{teams-linked,leaderboard-linked,awards-linked,picker,teams-picked,teams-picked-row,leaderboard-picked,leaderboard-hidden}.png`.
  - CONTEXT.md and the spec stretch list: PASS.
  - `pnpm gate`: PASS (479 unit tests, 136 smoke `ok`, 0 FAIL).
- Verified run commands: `pnpm gate`, then `pnpm tsx scripts/you-evidence.ts`.
- No deployed smoke: this slice has no deploy.

- PR: https://github.com/paul-macfarlane/war-weeker/pull/42
