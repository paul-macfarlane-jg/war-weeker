import { asc, count, eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { type WarWeek, day, scheduleItem } from "@/db/schema";

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
