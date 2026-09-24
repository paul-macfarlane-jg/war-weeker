# 20: "This is you": account linking and the "Which one is you?" picker

**What to build:** A signed-in person sees themselves highlighted on the Teams page roster and the individual leaderboard. First the app tries **account linking**: the session email is matched, ignoring case, to a Participant email in the War Week being viewed. When that finds nobody (the Participant has no email, or it's a different address), a **"Which one is you?"** picker lets the person choose themselves from the roster. The choice is stored in `localStorage` for each War Week. Spec stretch items 1 and 2 are combined here because they drive the same highlight.

**Blocked by:** 16 (it touches the same roster and leaderboard rows; branch from `staging` after 16 merges)

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24 from the spec's stretch list; Paul prioritized it for the hackathon. Confirm or adjust at the start of `/implement`.

- **The email match wins.** When the session email matches a Participant, that Participant is "you". The picker isn't shown, and a stored pick is ignored.
- **The picker:** a small "Which one is you?" control on the Teams page, a searchable select of this War Week's Participants, with "Not me / clear" to undo. The stored key is `ww:you:<edition>` and holds the Participant id. An id that doesn't exist in the War Week is dropped silently. All `localStorage` access is wrapped in try/catch.
- **The highlight:** the row gets a visible "You" tag and a ring or background in the Appearance Theme accent, with the Avatar from 16 kept. It appears on the Teams roster, the individual leaderboard (and the Reveal), and Participant Award recipients on `/awards`.
- **Hidden Standings stay hidden.** No highlight appears while hidden, and no new standings data reaches the client.
- There is no schema change, and linking writes nothing to the DB. It's a read-time match only. Organizers are not affected.
- Past editions work the same way, using that edition's roster.

## Acceptance criteria

- [ ] A pure function resolves "you" from (session email, Participants, stored id), with the email match first. Unit tests cover the email match (case-insensitive), no match with a valid stored id, a stale stored id, and neither.
- [ ] A signed-in user whose email is on the seeded roster sees "You" on the roster and the individual leaderboard with no picker. A seeded demo Participant needs an email that matches the smoke user so this can be proved.
- [ ] A user with no match can pick themselves, reload and still be highlighted, then clear the pick.
- [ ] Nothing is highlighted while standings are hidden.
- [ ] Screenshots at 390px of the roster and leaderboard with a highlight, and of the picker, under `test-results/20-you-highlight/`.
- [ ] `CONTEXT.md` defines **You** / account linking. The spec's Out of Scope stretch list marks items 1–2 as delivered.
- [ ] `pnpm gate` passes.

## Comments
