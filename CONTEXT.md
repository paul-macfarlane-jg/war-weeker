# CONTEXT

Domain glossary and vocabulary rules for War Weeker. Read this before naming
domain concepts in code, tests, tickets, or specs.

## Domain glossary

| Term                          | Meaning                                                                                                                           |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **War Week**                  | One annual edition. The top-level container.                                                                                      |
| **Edition**                   | The War Week's number (XI = 11). Used in URLs (`/xi`).                                                                            |
| **Story Theme**               | The year's narrative (The Matrix, Survivor).                                                                                      |
| **Day Theme**                 | A single day's theme ("Tournament Day").                                                                                          |
| **Appearance Theme**          | Colors, logo, banner and font preset for a War Week.                                                                              |
| **Mode**                      | `teams` or `free-for-all`. Decides which leaderboard is the main one.                                                             |
| **Team**                      | A competing group. Displayed using the War Week's **Team Label**.                                                                 |
| **Team Label**                | What teams are called this year (House / Tribe / Team).                                                                           |
| **Leader** / **Leader Title** | A participant flagged as a team leader, displayed with the year's title (Captain, Head of House). A label only, not a permission. |
| **Participant**               | A person in a War Week. A record, not a user.                                                                                     |
| **Avatar**                    | A Participant's visual marker: their initials in their Team's color for now, a portrait later.                                    |
| **Company Tag**               | An optional affiliation label on a participant (LTI, IL, …).                                                                      |
| **Organizer**                 | A signed-in `@jahnelgroup.com` user on the War Week's allowlist. The only role that can write.                                    |
| **Competition**               | Anything that awards points. Scored as team or individual.                                                                        |
| **Competition Group**         | An optional grouping of competitions ("Team Night Events").                                                                       |
| **Points Entry**              | One ledger row: points awarded to a team or participant for a competition.                                                        |
| **Placement Points**          | A Competition's optional preset points for 1st, 2nd, 3rd… (up to 5 places, highest first), offered as buttons on Points Entry.  |
| **Counts Toward Team**        | Whether an individual competition's points also go to the participant's team.                                                     |
| **Standings**                 | The main leaderboard, computed from Points Entries.                                                                               |
| **Reveal**                    | The organizer action that un-hides the standings, with an animation.                                                              |
| **Award**                     | A named honor given to participants or a team. It doesn't affect points.                                                          |
| **Announcement**              | An organizer post (rich text plus video links).                                                                                   |
| **FAQ Item**                  | A question and answer pair for a War Week.                                                                                        |
| **Archive**                   | The past War Weeks shown at `/history`.                                                                                           |

## Banned terms

Do not use these words in code (identifiers, comments, UI copy). Use the
"instead" term.

| Banned      | Use instead                                                          |
| ----------- | -------------------------------------------------------------------- |
| Event       | Competition, Announcement, or the specific thing being described     |
| League      | War Week, or nothing (there's no separate league concept)            |
| Member      | Participant                                                          |
| Match       | Competition, or the specific game/activity name                      |
| ELO         | Points, Points Entry, Standings                                      |
| Placeholder | "Coming in a later slice", stub, or name the concrete future feature |
| Tournament  | Competition                                                          |

Seed content copied verbatim from `old-wikis/` (e.g. a day theme literally
called "Tournament Day") is exempt: it is historical data, not code, and the
banned-term scan only covers `src/`, `scripts/`, and `drizzle/`.

## Schedule display rules

All Schedule Item times are ET wall-clock times; the Day supplies the date.
Now/next is computed on the ET clock, whatever the viewer's timezone.

- An item is **on now** from its start time (inclusive) to its end time
  (exclusive). An item with no end time counts as on for 60 minutes. An end
  time at or before the start time runs past midnight into the next day.
- **Up next** is every item sharing the earliest start time after now, on
  today's Day or a later one.
- Home and schedule pages accept `?at=<ISO instant>` to show the schedule as
  of that moment, for demos of a War Week that isn't on right now.

## Competition and roster display rules

- While standings are hidden, a Competition page shows its description, max
  points and scoring but not its Points Entries ("Points hidden 🔒"). Summing
  the entries would reveal the totals the Reveal keeps secret.
- The Competitions list orders Competition Groups, and Competitions within
  each, by name. Competitions with no group come last, under "Other
  Competitions" (no heading when nothing is grouped).
- A Competition's Points Entries are listed oldest first.
- The Teams page lists Teams by name, each with its Leaders first (marked
  with the Leader Title), then Participants by name. A free-for-all War Week
  shows one list of all Participants.
- A Participant's **Avatar** shows the first letter of the first and last
  words of their display name, uppercased, with no special cases ("Sir Paul
  of the Backend" → SB). Its fill is the Team color, or the Appearance
  Theme's primary color when there's no Team. It appears on the Teams page,
  the individual leaderboard and Award winners.

## Slack rules

- When a Slack webhook is configured, creating an Announcement can also post
  it to the War Week's Slack channel ("Also post to Slack", on by default).
  Edits, deletes, pins and seed loads never post.
- A failed Slack post never blocks publishing; the Organizer is told it
  failed.

## Access rules

- Sign-in is Google only. Any email whose domain isn't exactly
  `jahnelgroup.com` is refused: better-auth never creates a user for it,
  and a session with such an email counts as anonymous.
- An **Organizer** is a signed-in JG email on that War Week's
  `organizerEmails` (case-insensitive). `isOrganizer` in `src/lib/access.ts`
  is the one check; admin pages use `getAdminAccess` and server actions use
  `requireOrganizer` (both in `src/auth/organizer.ts`).
- `/admin` manages the current War Week. Anonymous visitors are sent to
  sign-in; signed-in non-Organizers see "Organizers only".
- Every page and API route needs a JG sign-in. Anonymous visitors to a
  page go to `/sign-in` and come back afterwards; API routes answer 401.
  Only `/sign-in` and `/api/auth/*` are public.
- `/api/mcp` also lets in `Authorization: Bearer <MCP_TOKEN>` (off when
  `MCP_TOKEN` is unset or blank), and anyone while `MCP_PUBLIC=true` (off by
  default; for a claude.ai connector demo). `canUseMcp` in
  `src/lib/access.ts` is the one check. Every MCP tool is read-only and
  returns only what a signed-in Participant sees: never hidden Standings, an
  email or the Organizer allowlist.

## Points Entry rules

- Organizers add, edit and delete Points Entries in `/admin/points`. A team
  Competition takes only Teams, an individual one only Participants of the
  same War Week; the server actions refuse anything else.
- Going over a Competition's max points shows a warning and still saves.
  Ties are just equal entries for each target.
- When a Competition has Placement Points, the form offers one button per
  place ("1st · 5"). A tap fills the Points field, which stays editable; it
  doesn't touch the note.
- An edit keeps the entry's entered-by email and entered-at time; the admin
  ledger marks it as edited.
- `/admin/points` shows the real Standings even while they're hidden.

## Reveal rules

- Organizers hide or reveal the current War Week's Standings in
  `/admin/standings`, through the `hideStandings` and `revealStandings` server
  actions. The actions take no War Week id.
- While hidden, the home and leaderboard pages show "Standings hidden 🔒",
  Competition pages hide their Points Entries, and MCP `get_leaderboard`
  returns the hidden result. No totals reach the client, not even in the RSC
  payload.
- An open home or leaderboard page refreshes about every 10 s. When a page
  that showed hidden Standings gets revealed ones, it plays the Reveal once:
  - Rows appear from last place up to first, and tied rows appear together.
  - Totals count up from 0.
  - Every list ends together, so each first place lands at the finale.
  - The whole Reveal is under 8 s.
- A page that first loads after the Reveal shows the Standings with no
  animation. So does one with `prefers-reduced-motion`.
- Refreshes pause while a tab isn't visible. A locked phone plays the Reveal
  when it's unlocked, or, if the browser reloaded the tab, just shows the
  Standings.
- Hiding again returns every page and MCP to hidden. The next Reveal plays
  again.

## Seed idempotence rules

A seed file loads in one transaction. Loading the same file twice leaves the
same rows with the same values (only `updated_at` moves).

- `war_week` rows are upserted by `edition`, the seed's natural key.
- **Setup data** is owned by the seed. Each row is upserted by its natural
  key within the War Week, and any row absent from the seed is deleted, so
  setup always matches the seed exactly after a load:
  - Day: `(war_week_id, date)`
  - Schedule Item: `(day_id, start_time, title)`
  - Team: `(war_week_id, name)`
  - Participant: `(war_week_id, display_name)`
  - Competition: `(war_week_id, name)`
  - FAQ Item: `(war_week_id, question)`; sort order is the position in the
    seed's `faqItems` list

  Seed references between entities use these names (a Points Entry names its
  Competition, Team or Participant). Removing a Team, Participant or
  Competition from the seed also deletes its Points Entries and Award
  recipients, and renaming one counts as a removal plus an addition, so fix
  spellings before organizers start entering points.
  - Changing a Competition's `scoring` in the seed does not re-check its
    existing Points Entries; the target-kind rule is enforced in zod (seed
    files and organizer actions), not the database.
- **Organizer-owned data** is seed-initialized but never clobbered:
  - `standings_hidden` is applied only when a War Week is first inserted.
  - Points Entries, Awards (with their recipients) and Announcements in a
    seed carry a `key`. The loader inserts a keyed record only when no record
    with that key exists, and never updates or deletes one. Records organizers
    create in the app have no key and are never touched by a load. Adding a
    new keyed record to a seed and reloading adds just that record.

**Setup in the UI.** Organizers can also edit setup in `/admin/setup`
(War Week settings, the Appearance Theme, Days, Schedule Items and FAQ
Items so far). The seed stays the
way to bootstrap a War Week, and there's no merge: reloading a seed makes
its War Week match the seed again, overwriting settings, Days and other
setup data edited in the UI and deleting setup rows the seed doesn't list.
Once organizers edit setup in the UI, update the seed file to match or stop
reloading it. Setup screens refuse edits that would cascade: switching to
free-for-all while Teams exist, dates that leave a Day outside the War Week,
deleting a Day with Schedule Items, and an Organizer removing their own
email.

**Reset exception.** `pnpm seed:load --reset` (and the Seed workflow's reset
option) deletes each seeded War Week, with all its setup and organizer-owned
data, before loading, so the War Week matches its seed exactly and
`standings_hidden` is applied again. It exists to reset demo data; never use
it on a War Week organizers are running.
