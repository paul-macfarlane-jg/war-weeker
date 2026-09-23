import { eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { competition, day, scheduleItem } from "@/db/schema";
import { type ScheduleDay, groupSchedule } from "@/lib/schedule";

/**
 * Loads a War Week's schedule: every Day with its Schedule Items, grouped
 * and ordered by `groupSchedule`.
 */
export async function getSchedule(
  warWeekId: string,
  dbOrTx: DBOrTx = db,
): Promise<ScheduleDay[]> {
  const [days, rows] = await Promise.all([
    dbOrTx
      .select({ id: day.id, date: day.date, dayTheme: day.dayTheme })
      .from(day)
      .where(eq(day.warWeekId, warWeekId)),
    dbOrTx
      .select({
        item: scheduleItem,
        competitionName: competition.name,
      })
      .from(scheduleItem)
      .innerJoin(day, eq(day.id, scheduleItem.dayId))
      .leftJoin(competition, eq(competition.id, scheduleItem.competitionId))
      .where(eq(day.warWeekId, warWeekId)),
  ]);

  return groupSchedule(
    days,
    rows.map(({ item, competitionName }) => ({
      id: item.id,
      dayId: item.dayId,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      host: item.host,
      location: item.location,
      virtualLink: item.virtualLink,
      description: item.description,
      category: item.category,
      competition:
        item.competitionId && competitionName
          ? { id: item.competitionId, name: competitionName }
          : null,
    })),
  );
}
