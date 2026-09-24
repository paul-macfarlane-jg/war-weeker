import { and, count, eq, ne, sql } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { day, scheduleItem, team, warWeek } from "@/db/schema";
import {
  type DayValues,
  type WarWeekSettingsValues,
  dayDeleteGuardError,
  dayGuardError,
  settingsGuardError,
} from "@/lib/setup";
import type { MutationContext, MutationResult } from "@/mutations/types";

const WAR_WEEK_NOT_FOUND = "That War Week no longer exists.";
const DAY_NOT_FOUND = "That Day no longer exists.";

/** Postgres unique_violation: another save took the date in the meantime. */
function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (
    (error as { code?: string })?.code === "23505" || cause?.code === "23505"
  );
}

/** Runs a Day write, turning a lost race for its date into a refusal. */
async function refusingDuplicateDate(
  date: string,
  write: () => Promise<MutationResult>,
): Promise<MutationResult> {
  try {
    return await write();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return { ok: false, error: `There's already a Day on ${date}.` };
  }
}

async function dayDates(
  warWeekId: string,
  dbOrTx: DBOrTx,
  exceptDayId?: string,
): Promise<string[]> {
  const rows = await dbOrTx
    .select({ date: day.date })
    .from(day)
    .where(
      exceptDayId
        ? and(eq(day.warWeekId, warWeekId), ne(day.id, exceptDayId))
        : eq(day.warWeekId, warWeekId),
    );
  return rows.map((row) => row.date);
}

/**
 * Saves the War Week's settings and Appearance Theme, refusing a save that
 * would strand Teams or Days or lock the saving Organizer out.
 */
export async function updateWarWeekSettings(
  values: WarWeekSettingsValues,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  return dbOrTx.transaction(async (tx): Promise<MutationResult> => {
    const [teams] = await tx
      .select({ count: count() })
      .from(team)
      .where(eq(team.warWeekId, ctx.warWeekId));
    const refusal = settingsGuardError(values, {
      actorEmail: ctx.actorEmail,
      teamCount: teams.count,
      dayDates: await dayDates(ctx.warWeekId, tx),
    });
    if (refusal) return { ok: false, error: refusal };

    const updated = await tx
      .update(warWeek)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(warWeek.id, ctx.warWeekId))
      .returning({ id: warWeek.id });
    return updated.length > 0
      ? { ok: true }
      : { ok: false, error: WAR_WEEK_NOT_FOUND };
  });
}

/** Checks a Day's date against its War Week and the War Week's other Days. */
async function dayRefusal(
  values: DayValues,
  ctx: MutationContext,
  tx: DBOrTx,
  exceptDayId?: string,
): Promise<string | null> {
  const [found] = await tx
    .select({ startDate: warWeek.startDate, endDate: warWeek.endDate })
    .from(warWeek)
    .where(eq(warWeek.id, ctx.warWeekId));
  if (!found) return WAR_WEEK_NOT_FOUND;
  return dayGuardError(values, {
    ...found,
    otherDayDates: await dayDates(ctx.warWeekId, tx, exceptDayId),
  });
}

export async function createDay(
  values: DayValues,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  return refusingDuplicateDate(values.date, () =>
    dbOrTx.transaction(async (tx): Promise<MutationResult> => {
      const refusal = await dayRefusal(values, ctx, tx);
      if (refusal) return { ok: false, error: refusal };
      await tx.insert(day).values({ warWeekId: ctx.warWeekId, ...values });
      return { ok: true };
    }),
  );
}

/** Edits a Day of this War Week; its Schedule Items move with it. */
export async function updateDay(
  id: string,
  values: DayValues,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  return refusingDuplicateDate(values.date, () =>
    dbOrTx.transaction(async (tx): Promise<MutationResult> => {
      const refusal = await dayRefusal(values, ctx, tx, id);
      if (refusal) return { ok: false, error: refusal };
      const updated = await tx
        .update(day)
        .set({ ...values, updatedAt: sql`now()` })
        .where(and(eq(day.id, id), eq(day.warWeekId, ctx.warWeekId)))
        .returning({ id: day.id });
      return updated.length > 0
        ? { ok: true }
        : { ok: false, error: DAY_NOT_FOUND };
    }),
  );
}

/** Deletes a Day of this War Week, refusing one that has Schedule Items. */
export async function deleteDay(
  id: string,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  return dbOrTx.transaction(async (tx): Promise<MutationResult> => {
    const [items] = await tx
      .select({ count: count() })
      .from(scheduleItem)
      .where(eq(scheduleItem.dayId, id));
    const refusal = dayDeleteGuardError(items.count);
    if (refusal) return { ok: false, error: refusal };

    const deleted = await tx
      .delete(day)
      .where(and(eq(day.id, id), eq(day.warWeekId, ctx.warWeekId)))
      .returning({ id: day.id });
    return deleted.length > 0
      ? { ok: true }
      : { ok: false, error: DAY_NOT_FOUND };
  });
}
