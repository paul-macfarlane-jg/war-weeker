import { asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { DBOrTx, db } from "@/db";
import {
  type WarWeek,
  day,
  scheduleItem,
  warWeek as warWeekTable,
} from "@/db/schema";

/** A Day as the setup page lists it. */
export type SetupDay = {
  id: string;
  date: string;
  dayTheme: string;
  scheduleItemCount: number;
};

/** A War Week's Days in date order, each with its Schedule Item count. */
export async function getSetupDays(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<SetupDay[]> {
  return dbOrTx
    .select({
      id: day.id,
      date: day.date,
      dayTheme: day.dayTheme,
      scheduleItemCount: count(scheduleItem.id),
    })
    .from(day)
    .leftJoin(scheduleItem, eq(scheduleItem.dayId, day.id))
    .where(eq(day.warWeekId, warWeek.id))
    .groupBy(day.id)
    .orderBy(asc(day.date));
}

const uuid = z.uuid();

/** The War Week a Day belongs to, for the Organizer check; undefined if none. */
export async function getDayWarWeek(id: string, dbOrTx: DBOrTx = db) {
  if (!uuid.safeParse(id).success) return undefined;
  const [found] = await dbOrTx
    .select({
      id: warWeekTable.id,
      edition: warWeekTable.edition,
      organizerEmails: warWeekTable.organizerEmails,
    })
    .from(day)
    .innerJoin(warWeekTable, eq(warWeekTable.id, day.warWeekId))
    .where(eq(day.id, id))
    .limit(1);
  return found;
}
