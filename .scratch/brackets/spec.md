---
title: War Weeker — Brackets, and hiding replaced by the Finale
status: ready-for-agent
labels: [ready-for-agent]
created: 2026-09-24
deadline: none. Only a complete, gate-passing vertical slice may merge before the 2026-09-25 08:00 ET staging freeze (ticket 1 is the likely candidate); the rest merges after submission.
source: Paul's first-use feedback and grilling session, 2026-09-24 (Q14–Q19, Q24–Q34, Q36)
order: 3 of 3 (after .scratch/admin-polish and .scratch/custom-inputs; built with shadcn per spec 2)
---

# Brackets, and hiding replaced by the Finale

## Problem Statement

War Week is full of head-to-head and heat-based games: 1v1 chess, Captain Clash, drafted 2v2s, group games with several teams at once. Competiscore had bracket support. War Weeker only has Points Entries, so Organizers have to run brackets on paper or a whiteboard and then type the final points in by hand. Participants can't see who they play next or when.

Separately, hiding Standings turned out not to be useful. It adds a whole rule set (hidden pages, hidden MCP, hidden Competition entries) for little value. The Reveal animation itself is the best part of it and deserves to live on as a closing-ceremony screen.

## Solution

1. **Remove hiding and turn the Reveal into the Finale** (ticket 1).
   - Standings are always visible.
   - The Reveal animation becomes an on-demand **Finale**: a full-screen, last-to-first countdown at `/<edition>/finale` for the closing ceremony.
   - It can also crown a finalized bracket's champion.
2. **Brackets.** A Competition gets a **Format**: `points` (today's behavior) or a bracket format.
   - **Formats:** single elimination, double elimination, round robin, multi-entrant heats, or group stage → knockout.
   - **Entrants:** Teams, Participants or ad-hoc **Squads**, with one-tap "all Teams" / pick-Participants shortcuts.
   - **Seeding:** random by default, by current Standings, or manual drag.
   - **Running it:** Organizers record Heat results, and Participants can self-report (opt-in per Competition) with confirmation.
   - **Points:** results become normal Points Entries, from final placings (default), per Heat won, or both. Standings stay computed only from Points Entries.
   - **Everywhere else:**
     - Heats show in Now/Next.
     - The bracket page refreshes live.
     - MCP gets `get_bracket`.
     - Seeds can hold brackets.
     - Slack can announce a champion.
     - The Archive shows past brackets.

Mobile first: the bracket view is designed from a phone prototype (ticket 2) before it's built.

## Vocabulary (add to CONTEXT.md)

"Tournament" and "Match" stay banned. New terms:

| Term | Meaning |
| --- | --- |
| **Finale** | The on-demand closing-ceremony screen that counts Standings in from last place to first. Replaces **Reveal**. |
| **Format** | How a Competition is run: `points`, `single-elimination`, `double-elimination`, `round-robin`, `heats`, `groups-knockout`. |
| **Bracket** | The Stages, Rounds and Heats of a non-`points` Competition. |
| **Stage** | One phase of a Bracket (a group stage, a knockout stage). Most Formats have one. |
| **Group** | A pool of Entrants within a round-robin Stage. Not a **Competition Group**. Name it "Pool" in code if the collision is confusing. |
| **Round** | One step of a Stage, holding Heats that can be played at the same time. |
| **Heat** | One game between two or more Entrants. Covers 1v1 and multi-entrant games. |
| **Entrant** | A Team, Participant or Squad entered in a Bracket. |
| **Squad** | An ad-hoc group of Participants entered as one Entrant, possibly across Teams. Belongs to one Competition. |
| **Seed Position** | An Entrant's starting rank in a Bracket. Say "seed position" or "seeding", never bare "seed", which means seed files here. |
| **Heat Result** | The finishing order of a Heat's Entrants, with an optional score for each. |
| **Self-report** | A Participant submitting a Heat Result for a Heat they're an Entrant in, pending confirmation. |

Remove **Reveal** and the "Reveal rules" section. Remove "Standings hidden" from the Competition display rules and the Access rules.

## User Stories

### Ticket 1: remove hiding, add the Finale
1. As a Participant, I always see Standings and every Competition's Points Entries; nothing is ever "hidden 🔒".
2. As an Organizer, I no longer see hide/reveal controls. `/admin/standings` becomes a **Finale** page with an "Open Finale" button and a "Finale: <Competition>" option for any finalized bracket.
3. As an Organizer at the closing ceremony, I open `/<edition>/finale` on the projector:
   - It shows a "Start" button.
   - Pressing it plays the countdown: rows appear from last to first, tied rows together, totals count up, every list finishes together, all in under 8 s. These are today's Reveal timing rules.
   - Keyboard `Space` / click starts it.
   - `prefers-reduced-motion` shows the final state.
   - "Replay" restarts it.
4. As an Organizer, I can run the Finale for a finalized bracket: its placings count in, and the champion gets a full-screen crown moment.
5. As a Claude user, MCP `get_leaderboard` always returns Standings.
6. As a visitor, the About page's reveal demo becomes a Finale demo, and its copy talks about the Finale, not hiding.

### Setting up a Bracket (Organizer)
7. As an Organizer creating a Competition, I pick a **Format**. `points` behaves exactly as today.
8. As an Organizer, I add Entrants quickly:
   - "All Teams".
   - "Pick Participants" (a searchable multi-select, filterable by Team).
   - "Add Squad" (name it, pick its Participants).
   - The Competition's `scoring` limits which kinds are allowed: team scoring takes Teams or Squads, individual takes Participants.
9. As an Organizer, I set Seed Positions: random (default, one-tap re-roll), by current Standings (Teams by Team Standings, Participants by individual Standings; not offered for Squads), or manual drag-to-reorder. Any method can be adjusted by drag afterwards.
10. As an Organizer, I configure the Format:
    - single/double elimination: optional third-place Heat; double elimination has a grand-final reset, on by default
    - round robin: number of Groups, and how many times each pair plays
    - heats: Entrants per Heat, how many advance from each, and number of Rounds, or "until one Heat left"
    - groups-knockout: Groups, how many advance from each Group, and the knockout options
11. As an Organizer, I press **Generate** to build the Bracket:
    - Byes appear automatically when the count isn't a power of two; top Seed Positions get them.
    - I can regenerate until the first Heat Result is recorded. After that, regenerating asks for confirmation and clears all results.
12. As an Organizer, I choose how the Bracket awards points: **placings** (default: final placings through the Competition's Placement Points), **per Heat won** (a points value per Heat win), or **both**.
13. As an Organizer, I can give any Heat an optional time (a Day + time, ET like Schedule Items) and location.

### Running a Bracket
14. As an Organizer, I record a Heat Result:
    - I tap Entrants in finishing order, with optional scores ("21–17", "1:32.4").
    - Knockout Heats need a clear order.
    - Round-robin and group Heats allow ties.
    - Winners advance automatically.
15. As an Organizer, I can mark a forfeit: the forfeiting Entrant loses, and the other(s) advance.
16. As an Organizer, I can edit a finished Heat. If later Heats depend on it, a confirmation lists those Heats, and they're reset to unplayed.
17. As an Organizer, I press **Finalize** when the Bracket is complete:
    - Points Entries are generated per the points setting.
    - The Bracket shows its champion.
    - An optional Slack post goes out ("Also post to Slack", like Announcements).
    - Un-finalizing deletes the generated Points Entries (after confirmation), and re-finalizing regenerates them.
18. As an Organizer, generated Points Entries appear in `/admin/points` marked "From bracket". They can't be edited there, and the bracket is where they change.

### Self-report (opt-in per Competition)
19. As a Participant who is an Entrant in a Heat, directly or through my Team or Squad, and whose sign-in links to my roster entry by email, I can submit that Heat's Result when self-report is on.
20. As another Entrant in that Heat (any linked Participant of another Entrant) or an Organizer, I can confirm or dispute a pending Result.
    - Only a confirmed Result advances anyone.
    - A dispute sends it back to pending with a note for Organizers.
21. As an Organizer, I can always overwrite or confirm any Result, and I see the pending and disputed Results in admin.

### Following a Bracket (Participant)
22. As a Participant on my phone, I see the Bracket in the layout chosen from the ticket 2 prototype:
    - Your Entrant highlighted (**You** rules).
    - Your next Heat pinned at the top: opponent, time, location.
23. As a Participant, round-robin and group Stages show a Group table (wins, ties, losses, score difference), with the Heats beneath.
24. As a Participant, the home page's Now/Next includes Heats with a time ("Up next · Heat 3 · Red vs Blue · Main room").
25. As a Participant, an open Bracket page refreshes about every 10 s and updates as Results land.
26. As a Claude user, MCP `get_bracket(competition)` returns the Bracket's Stages, Heats, Results and champion (read-only, no emails).
27. As a Participant browsing `/history`, a past edition's Bracket, entered by hand, displays the same way.

### Seeds
28. As a developer, a seed file can declare a Competition's Format, Entrants (including Squads), config and Heat Results. The XI demo seed ships one finished single-elimination Bracket and one in-progress round robin.

## Implementation Decisions

### Ticket 1 (hiding removal)
- Migration drops `war_week.standings_hidden`, and the seed schema drops it. The loader must tolerate old seed files that still have it (strip and ignore) or all seeds get updated. Prefer updating all seeds.
- Delete the `hideStandings`/`revealStandings` actions, the hidden branches in the queries, pages, Competition pages and MCP, and `standings-visibility-controls.tsx`.
- `reveal-standings.tsx` is kept and renamed to the Finale player, keeping the timing rules as **Finale rules** in CONTEXT.md. The auto-refresh stays for live Standings. Only the hidden→revealed trigger goes.
- `/<edition>/finale` is readable by any signed-in JG user (anyone may watch). Only Organizers see the admin link.
- `docs/agents/planning.md`: replace the "Standings hidden/reveal change" policy row with "Finale change: red-team not required; the Finale must never reorder or recompute Standings". Paul approved editing this team-owned doc (Q34).
- The About demo (`about-reveal-demo.tsx`, `scripts/about-media.ts` stills, `src/lib/about.ts` copy) moves to Finale wording. `/about` stays static.
- Ticket 1 changes the schema, so it needs a red-team review, a seed + migration update, and a smoke test.

### Ticket 2 (prototype)
- A throwaway `/prototype/bracket` page (or a standalone HTML artifact) with fake data, for an 8-entrant single elimination, a 16-entrant double elimination, a 4×4 round robin and a 12-entrant 4-per-heat set, at 375px. It compares at least:
  - (a) Rounds as horizontally swiped columns with connector lines
  - (b) a vertical list of Heats grouped by Round, with "next Heat" chips
  - (c) (b) plus a zoomable full-bracket overview
- Paul picks. If he isn't available when it's ready, the implementer picks, favoring one-thumb use and no horizontal page overflow, and records the choice and reasoning in this spec under "Decisions" for Paul to overrule. Delete the prototype before ticket 4 merges.

### Schema (ticket 3)
- `competition.format` pgEnum (default `points`), `competition.bracket_config jsonb` (zod-validated per Format), `competition.bracket_points` enum `placings | per-heat | both`, `competition.points_per_heat_win numeric`, `competition.self_report boolean default false`, `competition.finalized_at timestamptz`.
- `squad(id, competition_id, name)` and `squad_participant(squad_id, participant_id)`. A Participant is in at most one Squad per Competition.
- `entrant(id, competition_id, team_id | participant_id | squad_id` (exactly one, check constraint), `seed_position int)`, unique per competition and target.
- `stage(id, competition_id, kind, position, config jsonb)`; `bracket_group(id, stage_id, name)`; `round(id, stage_id, bracket_group_id?, position, side: winners|losers|final)`.
- `heat(id, round_id, position, day_id?, start_time?, location?, status: pending|ready|reported|confirmed|disputed|forfeit)`, plus links to the Heats its winners and losers feed (`winner_to_heat_id`, `loser_to_heat_id`, slot numbers).
- `heat_entrant(heat_id, entrant_id, slot, place, score varchar(40), advanced boolean)`.
- `heat_report(heat_id, reported_by_email, result jsonb, confirmed_by_email?, disputed_note?, created_at)`. This is an audit trail, and it's never sent to the client with emails.
- `points_entry.competition_id` stays. Add `points_entry.generated_by_bracket boolean default false`, or a `source` enum. Generated rows are replaced wholesale on re-finalize.
- Setup-seed natural keys: Squad `(competition, name)`; Entrant `(competition, target name)`; Heats by `(stage position, round position, heat position)`. Bracket data is setup data (upserted, and deleted when absent) except Heat Results. Heat Results are Organizer-owned once the War Week is live: they're keyed like Points Entries (`key`) and never clobbered. The loader enforces Seed idempotence rules.
- Deleting a Competition cascades its Bracket. Deleting a Team or Participant that is an Entrant is refused with counts (existing refusal pattern).

### Engine
- A pure module, `src/lib/bracket/`, holds all bracket logic, with no DB. It's the most heavily tested part:
  - `generate(format, config, entrants) → stages/rounds/heats`
  - `applyResult(bracket, heatId, result) → bracket` (advancement and bye propagation)
  - `resetDownstream`
  - `groupTable` (win 1, tie ½, loss 0; tiebreak head-to-head, then score difference when scores are numeric, then Seed Position)
  - `finalPlacings`
  - `pointsFor(bracket, competition) → Points Entry drafts`
- Double elimination: standard winners/losers with a grand final. The optional reset Heat is played only if the losers-side Entrant wins the first grand final.
- Heats Format: sort each Heat by place, advance the top N into the next Round's Heats, snake-seeded. The last Round's order is the final placing.
- Groups-knockout: round-robin Groups, then the top N of each Group into single elimination, cross-seeded (A1 v B2, B1 v A2, …).
- Final placings for elimination: 1st, 2nd, then 3rd (from the third-place Heat, or tied 3rd), and later places tied by the Round they lost in. Placement Points apply to places 1–5. Tied places each get that place's points (existing "ties are equal entries" rule).

### Access
- Organizers (`requireOrganizer`) do all setup, generation, results, finalizing and overrides. There are no new roles (Q18).
- Self-report is the first non-Organizer write in the app. It needs a red-team review and its own check in `src/lib/access.ts` (e.g. `canReportHeat(sessionEmail, heat, roster)`):
  - self-report must be on
  - the session must be a JG email that account-links (email match, not the localStorage "Which one is you?" pick) to a Participant who is, or is on, one of the Heat's Entrants
  - the Heat must be `ready` or `disputed`
- Confirming requires a linked Participant on a *different* Entrant in the same Heat, or an Organizer.
- Google-only, `@jahnelgroup.com`-only sign-in is unchanged. MCP stays read-only.

### Surfaces
- `/<edition>/competitions/<id>` renders the Bracket for non-`points` Formats (layout from ticket 2).
- `/admin/setup/competitions/<id>/bracket` is the builder: Entrants, seeding, config, Generate.
- `/admin/brackets/<id>` runs results (phone-first).
- Now/Next: Heats with a Day and start time join the Schedule's now/next computation under the same ET rules (60 minutes when there's no end). A Heat is never duplicated by a Schedule Item that links the same Competition; both show.
- Live refresh reuses `auto-refresh.tsx`.
- MCP `get_bracket` lives in `src/mcp/`, registered in `tools.ts`, never returns emails, and gets tests like the other tools.
- Slack: a finalize post reuses the Announcement webhook path. A failure never blocks finalizing, and the Organizer is told.
- Archive: past editions render Brackets from their data. There's no extraction from old wikis in this spec; manual entry through the admin works for any edition.
- All UI uses shadcn components (spec 2 rule).

## Suggested ticket order (for /to-tickets)

1. Remove hiding; Reveal → Finale (schema, red-team).
2. Bracket view prototype at 375px; the pick is recorded.
3. Bracket schema + seed schema + migration + engine skeleton (red-team).
4. Single elimination end to end: builder, seeding, Generate, results, byes, forfeits, reset of later Heats, participant view, XI demo bracket.
5. Finalize → Points Entries (placings / per-heat / both), "From bracket" in the admin ledger, Finale for a Bracket, Slack post.
6. Round robin + Group tables + ties.
7. Double elimination (+ grand-final reset).
8. Multi-entrant heats.
9. Groups → knockout.
10. Squads.
11. Self-report + confirm/dispute (access change, red-team).
12. Heat times/locations + Now/Next.
13. MCP `get_bracket`, live refresh, Archive view.

Each ticket is a vertical slice that passes `pnpm gate` alone.

## Acceptance Criteria

- [ ] **Ticket 1:**
  - No `standings_hidden` column, action, UI or copy remains (grep `standingsHidden|hideStandings|revealStandings|hidden 🔒` is empty outside migrations).
  - MCP `get_leaderboard` always returns Standings (test).
  - `/xi/finale` plays the countdown on Start, and reduced motion shows the final state (screenshot plus a short video, since motion and timing matter).
  - The planning.md and CONTEXT.md updates are in the PR.
- [ ] **Engine:** unit tests for every Format:
  - generation for 2–17 Entrants, including byes
  - advancement, forfeits and reset of later Heats
  - the double-elimination reset
  - Group table ties and tiebreaks
  - Heats-format advancement
  - groups-knockout cross-seeding
  - final placings and tied places
  - `pointsFor` under placings, per-heat and both
- [ ] **Seeds:** the XI seed loads twice idempotently with its demo Brackets. An organizer-entered Heat Result survives a reload. Invalid bracket fixtures are rejected (seed schema tests).
- [ ] **Finalize:** generated Points Entries appear in Standings. Un-finalizing removes them. Re-finalizing produces the same entries. Hand-entered Points Entries on the same Competition are untouched.
- [ ] **Access** (red-team + tests):
  - A non-linked or non-Entrant session can't report.
  - A linked Entrant can report only their own Heat, only when self-report is on.
  - Only a different Entrant or an Organizer can confirm.
  - Non-JG emails are still refused.
  - MCP remains read-only and email-free.
- [ ] Now/Next shows timed Heats under the ET rules, with a unit test using `?at=`.
- [ ] `get_bracket` has tests like the other MCP tools, and smoke hits `/api/mcp`.
- [ ] Screenshots at 375px and 1280px of each Format's participant view, the builder and the results screen, in XI and one dark past edition; zero horizontal overflow at 375/768/1280.
- [ ] CONTEXT.md glossary updated with the vocabulary above, and the banned-term scan still passes.
- [ ] `pnpm gate` passes on every ticket's PR.

## Out of Scope

- Swiss and ladder / king-of-the-hill Formats (Swiss is a likely follow-up).
- New roles (Scorekeeper, Competition Runner). Organizers only, plus Self-report.
- Extracting historical brackets from `old-wikis/`.
- Live score streaming within a Heat.
