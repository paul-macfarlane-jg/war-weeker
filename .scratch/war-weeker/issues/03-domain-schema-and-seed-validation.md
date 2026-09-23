# 03: Domain schema and seed validation

**What to build:** An organizer can describe a complete War Week in one seed file: Days, Schedule Items, Teams, Participants, Competitions, Points Entries, Awards, Announcements and FAQ Items. They get clear validation errors before anything loads, and the whole file loads in one transaction. This is a prefactor so the feature slices after it don't need schema changes. It also adds the shared rich-text content schema and the read-only viewer that those slices render with.

**Blocked by:** 01

**Status:** ready-for-agent

**Notes:**
- Entities, fields and rules are exactly as listed in the spec's Schema section.
- Rich text: copy from journeys. Content is ProseMirror JSON in `jsonb`, a zod content schema with sanitizers runs on write and again on render, and the read-only viewer is server-rendered.
- Changes the Drizzle schema, so red-team the plan, and update the demo seed together with the migration (repo policy).

- [x] The schema and seed schema cover every entity in the spec; Participant email is optional and unique within a War Week
- [x] A Points Entry targets exactly one of Team or Participant, enforced both in the database and in zod
- [x] Seed parsing rejects each invalid fixture with a readable error: a Points Entry with both targets or neither, an unknown Schedule Item category, Counts Toward Team set on a team Competition, a video URL outside the YouTube/Loom/Vimeo/Drive allow-list, and duplicate Participant emails
- [x] Seed parsing rejects a Points Entry whose target kind doesn't match its Competition's scoring
- [x] A vitest test asserts that every committed seed file passes the seed schema
- [x] The XI seed is extended with a few sample records for each new entity and loads cleanly; loading again is idempotent
- [x] The read-only rich-text viewer renders sanitized content; unsafe content (e.g. a `javascript:` link) is stripped on render
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [CLOSEOUT] 2026-09-23 (via /implement)

- Schema: migration `drizzle/0001_thankful_vulcan.sql` adds team, participant, competition, schedule_item, points_entry, award, award_participant, announcement, faq_item. DB checks: `points_entry_exactly_one_target`, `competition_counts_toward_team_individual_only`; unique (war_week_id, email) on participant.
- Seed schema `src/seed/schema.ts` rejects every listed invalid fixture plus target-kind mismatch, unknown references, duplicate names/keys, Awards with no recipient, Teams in free-for-all. Tests in `src/seed/schema.test.ts` (including every committed seed file).
- Loader `src/seed/load.ts`: one transaction; setup upserted by natural key, absent rows deleted; organizer-owned records (Points Entries, Awards, Announcements) keyed and insert-if-absent. Rules in CONTEXT.md.
- Rich text: `src/lib/rich-text/content.ts` (schema and sanitizer from journeys), `src/components/rich-text.tsx` (server-rendered React viewer, re-sanitizes on render; deviation: not TipTap `generateHTML`, so there's no new dependency).
- Gate: `pnpm gate` exit 0. 38 vitest tests; the smoke test adds per-entity counts after a double load and a DB rejection of a two-target Points Entry.
- Deviations: no red-team pass (run via /implement, not /atlas-implement). Target kind vs scoring is zod-only.
- AI code review (standards + spec) fixed: points bound to numeric(8,2), email swap between kept Participants, Award recipient required, CONTEXT wording on idempotence/renames. Deferred judgement calls: sync-helper duplication in load.ts, enum values duplicated between pgEnum and z.enum (matches existing idiom).
