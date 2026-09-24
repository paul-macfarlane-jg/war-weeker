# 16: Participant initials Avatars

**What to build:** Give every Participant an **Avatar**: a small circle with their initials in their Team's color. Show it on the Teams page roster, the individual leaderboard rows and the Award winners on `/awards`. No photos, no AI, no schema change. This is the deadline-sized slice of the original "themed portraits and bios" idea; the rest moved to ticket 19.

**Blocked by:** none

**Status:** in-progress

## Decisions

Grilled 2026-09-24 with Paul.

- **Initials:** the first letter of the first word and the first letter of the last word of `displayName`, uppercased. One word gives one letter. No special cases for titles or particles ("Paul Macfarlane" → PM, "Cher" → C, "Sir Paul of the Backend" → SB).
- **Color:** the fill is the Participant's Team color. A Participant with no Team, or in a free-for-all War Week, gets the War Week's Appearance Theme primary color. The text is white or black, whichever has higher contrast against the fill.
- **Where:** the Teams page roster, the individual leaderboard (including during the Reveal, since those are the same rows) and Participant recipients on `/awards`. Team recipients of Awards get no Avatar. Admin pages are out of scope.
- The Avatar is decorative next to the visible name (`aria-hidden`), so screen readers don't read the initials twice.
- **Out of scope here:** photos, scraping jahnelgroup.com, AI restyling, bios, Organizer review. All of this is in ticket 19.

## Acceptance criteria

- [ ] A pure function derives initials from a display name. Unit tests cover two words, one word, many words, extra whitespace, and lowercase input.
- [ ] A pure function picks the Avatar colors (Team color, else the Appearance Theme primary color) and the higher-contrast text color. Unit tests cover a light fill and a dark fill.
- [ ] One shared Avatar component is used on the Teams page roster, the individual leaderboard rows and Participant Award recipients.
- [ ] Hidden Standings stay hidden: the individual leaderboard shows no Avatars or names while hidden (no new data reaches the client).
- [ ] Screenshots of the Teams page, the individual leaderboard and `/awards` for the seeded demo War Week, at 390px wide, saved under `test-results/16-avatars/`.
- [ ] `CONTEXT.md` defines **Avatar** and its display rule (done during grilling; keep it in sync if the implementation differs).
- [ ] `pnpm gate` passes.

## Comments
