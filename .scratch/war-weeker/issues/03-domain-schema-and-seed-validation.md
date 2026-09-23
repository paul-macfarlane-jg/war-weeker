# 03: Domain schema and seed validation

**What to build:** An organizer can describe a complete War Week in one seed file: Days, Schedule Items, Teams, Participants, Competitions, Points Entries, Awards, Announcements and FAQ Items. They get clear validation errors before anything loads, and the whole file loads in one transaction. This is a prefactor so the feature slices after it don't need schema changes. It also adds the shared rich-text content schema and the read-only viewer that those slices render with.

**Blocked by:** 01

**Status:** ready-for-agent

**Notes:**
- Entities, fields and rules are exactly as listed in the spec's Schema section.
- Rich text: copy from journeys. Content is ProseMirror JSON in `jsonb`, a zod content schema with sanitizers runs on write and again on render, and the read-only viewer is server-rendered.
- Changes the Drizzle schema, so red-team the plan, and update the demo seed together with the migration (repo policy).

- [ ] The schema and seed schema cover every entity in the spec; Participant email is optional and unique within a War Week
- [ ] A Points Entry targets exactly one of Team or Participant, enforced both in the database and in zod
- [ ] Seed parsing rejects each invalid fixture with a readable error: a Points Entry with both targets or neither, an unknown Schedule Item category, Counts Toward Team set on a team Competition, a video URL outside the YouTube/Loom/Vimeo/Drive allow-list, and duplicate Participant emails
- [ ] Seed parsing rejects a Points Entry whose target kind doesn't match its Competition's scoring
- [ ] A vitest test asserts that every committed seed file passes the seed schema
- [ ] The XI seed is extended with a few sample records for each new entity and loads cleanly; loading again is idempotent
- [ ] The read-only rich-text viewer renders sanitized content; unsafe content (e.g. a `javascript:` link) is stripped on render
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
