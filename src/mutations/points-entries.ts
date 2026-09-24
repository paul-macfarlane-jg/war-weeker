import { and, eq, inArray, sql } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { competition, pointsEntry } from "@/db/schema";
import {
  type PointsEntryValues,
  pointsEntryTarget,
  pointsEntryTargetError,
} from "@/lib/points-entry";
import type { MutationContext, MutationResult } from "@/mutations/types";
import {
  getCompetitionInWarWeek,
  getTargetKind,
} from "@/queries/points-entries";

const NOT_FOUND = "That Points Entry no longer exists.";

/**
 * The columns to write for a Points Entry of this War Week: the Competition
 * must belong to it, and the target must be one of its Teams or
 * Participants of the kind the Competition's scoring allows.
 */
async function resolveColumns(
  input: PointsEntryValues,
  warWeekId: string,
  dbOrTx: DBOrTx,
) {
  const [found, kind] = await Promise.all([
    getCompetitionInWarWeek(warWeekId, input.competitionId, dbOrTx),
    getTargetKind(warWeekId, input.targetId, dbOrTx),
  ]);
  if (!found) {
    return {
      ok: false as const,
      error: "Choose a Competition of this War Week.",
    };
  }
  if (!kind) {
    return {
      ok: false as const,
      error: "Choose a Team or Participant of this War Week.",
    };
  }
  const refusal = pointsEntryTargetError(found, kind);
  if (refusal) return { ok: false as const, error: `${refusal}.` };

  return {
    ok: true as const,
    columns: {
      competitionId: input.competitionId,
      ...pointsEntryTarget(kind, input.targetId),
      points: input.points,
      note: input.note,
    },
  };
}

/** Only Points Entries whose Competition belongs to the War Week. */
function inWarWeek(id: string, warWeekId: string, dbOrTx: DBOrTx) {
  return and(
    eq(pointsEntry.id, id),
    inArray(
      pointsEntry.competitionId,
      dbOrTx
        .select({ id: competition.id })
        .from(competition)
        .where(eq(competition.warWeekId, warWeekId)),
    ),
  );
}

export async function createPointsEntry(
  input: PointsEntryValues,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  const resolved = await resolveColumns(input, ctx.warWeekId, dbOrTx);
  if (!resolved.ok) return resolved;

  await dbOrTx
    .insert(pointsEntry)
    .values({ ...resolved.columns, enteredByEmail: ctx.actorEmail });
  return { ok: true };
}

/**
 * Edits a Points Entry of this War Week. Its entered-by email and time stay
 * as they were; `updated_at` records the edit.
 */
export async function updatePointsEntry(
  id: string,
  input: PointsEntryValues,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  const resolved = await resolveColumns(input, ctx.warWeekId, dbOrTx);
  if (!resolved.ok) return resolved;

  const updated = await dbOrTx
    .update(pointsEntry)
    // The database clock, like `created_at`, so the two compare exactly.
    .set({ ...resolved.columns, updatedAt: sql`now()` })
    .where(inWarWeek(id, ctx.warWeekId, dbOrTx))
    .returning({ id: pointsEntry.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: NOT_FOUND };
}

export async function deletePointsEntry(
  id: string,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  const deleted = await dbOrTx
    .delete(pointsEntry)
    .where(inWarWeek(id, ctx.warWeekId, dbOrTx))
    .returning({ id: pointsEntry.id });
  return deleted.length > 0 ? { ok: true } : { ok: false, error: NOT_FOUND };
}
