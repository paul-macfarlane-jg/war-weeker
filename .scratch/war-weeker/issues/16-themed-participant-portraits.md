# 16: Themed Participant portraits and bios (reach, needs refinement)

**What to build:** Give Participants a face and a short in-character bio. Pull each person's headshot from the public Jahnel Group website, optionally restyle it with AI to match the War Week's Appearance Theme (e.g. knight, pirate, house crest), and pair it with a one- or two-line theme-flavored bio. Shown on Team pages, the leaderboard, and Awards. The exact shape is not decided yet.

**Blocked by:** none (but do this only after core functionality is done)

**Status:** needs-info

> **Needs refinement before any work.** This is a placeholder so the idea isn't lost. Grill it (`/grill-with-docs`) and turn it into real acceptance criteria before it moves to `ready-for-agent`. Participant is currently "a record, not a user" with no image or bio fields, so this adds to the domain model (`CONTEXT.md`).

## Candidate ideas (not commitments)

- Match Participants to jahnelgroup.com team-page entries by name and store the photo URL (or a copied image) on the Participant
- Plain headshots first; AI theme restyling as a second step
- AI-generated theme bios from the person's public title plus the year's story theme ("Sir Paul of the Backend, Keeper of Migrations")
- Organizer review before anything shows: approve, regenerate, or replace per person
- Fallback avatar (initials in the Team color) for anyone without a match
- Surface portraits on Team pages, the individual leaderboard, Award winners, and the Reveal

## Open questions to grill

- **Consent:** is it OK to show AI-altered likenesses of coworkers? Opt-in, opt-out, or organizer-approved only? Does anyone need to sign off (marketing, HR)?
- Is scraping the public site acceptable, or should Organizers upload photos / paste URLs instead? How are name mismatches and people not on the site (contractors, LTI/IL Company Tags) handled?
- Which image model does the restyling, what does it cost for ~100 people, and is it a one-off batch script or an in-app action?
- Where do images live (Vercel Blob, Neon, committed static files) and how big can they be for a phone on conference Wi-Fi?
- Bios: AI-generated, Organizer-written, or AI draft plus Organizer edit? Where does the source info come from, and what keeps them kind and not embarrassing?
- Per-War-Week (restyled for each year's theme) or one portrait per person reused across years? History War Weeks likely stay without portraits.
- Is the public app OK showing employee faces to anyone with the link, given it has no sign-in?
- Does the MCP server expose portraits or bios?
- What is the smallest version that fits the deadline (Fri 2026-09-25 10:00 AM), if any?
