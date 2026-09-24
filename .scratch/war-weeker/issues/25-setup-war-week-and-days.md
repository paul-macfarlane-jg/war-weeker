# 25: Setup screens: War Week settings, Appearance Theme and Days

**What to build:** An Organizer can edit the current War Week's settings in `/admin/setup`, without a seed. The settings are Story Theme, dates, status, mode, Team Label, Leader Title, Slack URL, wiki URL, organizer emails, the Appearance Theme (colors, logo/banner URLs, font preset) and the Days with their Day Themes. This is the first of three setup tickets (25 War Week and Days, 26 Teams, roster and Competitions, 27 Schedule and FAQ). It owns the `/admin/setup` section shell.

**Blocked by:** none

**Status:** ready-for-agent

## Decisions

Proposed by Claude on 2026-09-24. Paul put "setup screens" in the hackathon scope. Confirm at the start of `/implement`.

- **Seed vs UI.** Setup stops being seed-only. The seed stays the way to bootstrap a War Week, but re-running the seed on a War Week overwrites UI setup edits (the loader upserts by natural key and deletes absent rows). Document this in the README and CONTEXT.md, and put a warning on `/admin/setup`. There's no merge logic.
- **Shell:** `/admin/setup` is a landing page with links to "War Week", "Days" (this ticket), "Teams & roster", "Competitions" (26), and "Schedule", "FAQ" (27). Tickets 26 and 27 add their own pages and only turn their links on. Add one "Setup" entry to the admin nav in `admin-shell.tsx`, here only.
- **Validation:** reuse the seed zod schemas (`src/seed/schema.ts`) for field rules so seed and UI can't drift. Server actions go through the existing organizer check. Colors show a live preview swatch and contrast warning, reusing `src/lib/theme.ts`.
- **Guards:** changing `mode` to free-for-all while Teams exist, or deleting a Day that has Schedule Items, is refused with a message. There are no cascading surprises.
- Changing status to `complete` is allowed. Creating a new War Week and editing past editions are out of scope.

## Acceptance criteria

- [ ] Server actions for War Week settings and Day create/edit/delete with unit tests on the validation mapping, including the guards above.
- [ ] An Organizer changes the primary color and a Day Theme, and the public `/xi` reflects it. Smoke covers one settings save.
- [ ] A non-Organizer gets the existing refusal.
- [ ] Screenshots at 390px and desktop of the setup landing, the settings form and Days under `test-results/25-setup-war-week/`.
- [ ] The spec's "Admin screens for setup" Out of Scope line and CONTEXT.md are updated.
- [ ] `pnpm gate` passes.

## Comments
