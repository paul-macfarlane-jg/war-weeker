# 09: Points Entry admin

**What to build:** An Organizer records a result in seconds: choose a Competition, then a Team or Participant (only the kind the Competition's scoring allows), then points (decimals allowed) and an optional note. Going over the Competition's max points shows a warning but still saves. Organizers can edit and delete entries, see the full ledger with who entered each one and when, and see the current standings in admin even while they're hidden. Participants' leaderboards update within about 10 seconds. A written note records how a future Stairs App integration for HQ Attendance would work.

**Blocked by:** 05, 08

**Status:** ready-for-agent

- [ ] Server actions create, edit and delete Points Entries; each rejects callers who aren't on the War Week's organizer allowlist
- [ ] The form offers only Teams for team Competitions and only Participants for individual Competitions; the server rejects a mismatched target
- [ ] Over-max entries show a warning and save; ties are entered as equal points for each target, with no special handling
- [ ] Every Competition can be scored by hand, including those with no schedule slot
- [ ] The ledger lists every entry with entered-by email and entered-at time
- [ ] Admin shows standings from the Standings function even when `standingsHidden` is on
- [ ] End to end (locally, un-hidden): an entry saved in admin shows up on an open `/xi/leaderboard` within ~10 s
- [ ] A Stairs integration doc stub records what the spec says: stair climbs are keyed by `@jahnelgroup.com` email, the API needs a Firebase ID token, the recommended route is an API-key-protected date-range report endpoint (about 5–8 h), and no one is documented as owning the Stairs deploy
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
