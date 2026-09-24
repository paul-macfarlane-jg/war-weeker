"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import { db } from "@/db";
import { pointsEntry } from "@/db/schema";
import {
  type PointsEntryInput,
  checkPointsEntryTarget,
  parsePointsEntryInput,
} from "@/lib/points-entry";
import {
  getCompetitionWithWarWeek,
  getPointsEntryWarWeek,
  getTargetRoster,
} from "@/queries/points-entries";

export type PointsEntryActionResult =
  { ok: true } | { ok: false; error: string };

const NOT_FOUND = "That Points Entry no longer exists.";

/**
 * Validates a Points Entry form against the database: the Competition
 * exists, the caller is an Organizer of its War Week, and the target is one
 * of that War Week's Teams or Participants of the kind the Competition's
 * scoring allows.
 */
async function resolvePointsEntry(input: PointsEntryInput) {
  const parsed = parsePointsEntryInput(input);
  if (!parsed.ok) return parsed;

  const found = await getCompetitionWithWarWeek(parsed.value.competitionId);
  if (!found) return { ok: false as const, error: "Choose a Competition." };

  const organizer = await requireOrganizer(found.warWeek);
  if (!organizer.ok) return organizer;

  const roster = await getTargetRoster(found.warWeek, parsed.value.targetId);
  const target = checkPointsEntryTarget(
    found.competition,
    parsed.value.targetId,
    roster,
  );
  if (!target.ok) return target;

  return {
    ok: true as const,
    warWeek: found.warWeek,
    email: organizer.email,
    values: {
      competitionId: parsed.value.competitionId,
      ...target.target,
      points: parsed.value.points,
      note: parsed.value.note,
    },
  };
}

function revalidateWarWeek(edition: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/${edition}`, "layout");
}

export async function createPointsEntry(
  input: PointsEntryInput,
): Promise<PointsEntryActionResult> {
  const resolved = await resolvePointsEntry(input);
  if (!resolved.ok) return resolved;

  await db
    .insert(pointsEntry)
    .values({ ...resolved.values, enteredByEmail: resolved.email });

  revalidateWarWeek(resolved.warWeek.edition);
  return { ok: true };
}

/**
 * Edits a Points Entry. Its entered-by email and time stay as they were; the
 * ledger shows the edit through `updated_at`.
 */
export async function updatePointsEntry(
  id: string,
  input: PointsEntryInput,
): Promise<PointsEntryActionResult> {
  const current = await getPointsEntryWarWeek(id);
  if (!current) return { ok: false, error: NOT_FOUND };

  const organizer = await requireOrganizer(current);
  if (!organizer.ok) return organizer;

  const resolved = await resolvePointsEntry(input);
  if (!resolved.ok) return resolved;
  if (resolved.warWeek.id !== current.id) {
    return { ok: false, error: "Choose a Competition of this War Week." };
  }

  const updated = await db
    .update(pointsEntry)
    .set({ ...resolved.values, updatedAt: new Date() })
    .where(eq(pointsEntry.id, id))
    .returning({ id: pointsEntry.id });
  if (updated.length === 0) return { ok: false, error: NOT_FOUND };

  revalidateWarWeek(current.edition);
  return { ok: true };
}

export async function deletePointsEntry(
  id: string,
): Promise<PointsEntryActionResult> {
  const current = await getPointsEntryWarWeek(id);
  if (!current) return { ok: false, error: NOT_FOUND };

  const organizer = await requireOrganizer(current);
  if (!organizer.ok) return organizer;

  await db.delete(pointsEntry).where(eq(pointsEntry.id, id));

  revalidateWarWeek(current.edition);
  return { ok: true };
}
