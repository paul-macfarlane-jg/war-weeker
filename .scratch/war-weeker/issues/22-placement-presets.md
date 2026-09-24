# 22: Placement presets on Points Entry

**What to build:** When entering points for a Competition, an Organizer can tap **1st / 2nd / 3rd** to fill in the points instead of typing them. The presets come from the Competition.

**Blocked by:** none

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24. The precedent is the old wikis ("5 / 3 / 1 House Cup points for 1st, 2nd & 3rd place", Wizard's Chess). Confirm at the start of `/implement`.

- **Schema:** `competition.placement_points numeric(8,2)[]`, nullable, ordered 1st, 2nd, 3rd…, up to 5 values. They must be non-increasing and non-negative. When `maxPoints` is set, the first value can't exceed it. Add a migration and the seed schema field with zod validation, including invalid-fixture tests in the same style as the existing ones.
- **Form:** on `src/components/points-entry-form.tsx`, when the chosen Competition has `placementPoints`, show one button per place ("1st · 5"). A tap sets the points field, which stays editable. It doesn't set the reason. No buttons appear when the Competition has no presets.
- **Seed:** give the XI demo Competitions that are placement-shaped a 5/3/1 preset. Leave the others unset.
- This is the only ticket in the hackathon batch that changes the schema. Tickets 25–27 must branch after it merges if they touch Competitions (26 does).

## Acceptance criteria

- [x] Migration and seed field. Seed validation rejects increasing, negative, over-`maxPoints` and more-than-5 lists, and tests cover each.
- [x] A pure function maps (Competition, place) to points. Unit tests cover it.
- [x] Points-entry form shows the preset buttons only for Competitions with presets, and a tap fills the field. Smoke or a screenshot proves it.
- [x] Screenshot at 390px of the form with presets under `test-results/22-placement-presets/`.
- [x] `CONTEXT.md` defines **Placement Points**. The spec stretch item 3 is marked delivered.
- [x] `pnpm gate` passes.

## Comments
