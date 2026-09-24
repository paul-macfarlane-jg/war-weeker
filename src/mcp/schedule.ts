import type { ScheduleItem } from "@/db/schema";
import { toPlainText } from "@/lib/rich-text/plain-text";
import { type ScheduleDay, WAR_WEEK_TIME_ZONE } from "@/lib/schedule";

export type ScheduleResult = {
  edition: string;
  timeZone: typeof WAR_WEEK_TIME_ZONE;
  date: string | null;
  days: {
    date: string;
    dayTheme: string;
    items: {
      startTime: string;
      endTime: string | null;
      title: string;
      host: string | null;
      location: string | null;
      virtualLink: string | null;
      category: ScheduleItem["category"];
      competition: string | null;
      description: string | null;
    }[];
  }[];
};

/** `HH:MM:SS` as `HH:MM`. */
function toHourMinute(time: string): string {
  return time.slice(0, 5);
}

/**
 * Serializes a War Week's schedule (already narrowed to `date` by the query
 * when one was asked for) into the `get_schedule` MCP tool payload. Times
 * are ET wall-clock `HH:MM`.
 */
export function toScheduleResult(
  edition: string,
  days: ScheduleDay[],
  date?: string,
): ScheduleResult {
  return {
    edition,
    timeZone: WAR_WEEK_TIME_ZONE,
    date: date ?? null,
    days: days.map((day) => ({
      date: day.date,
      dayTheme: day.dayTheme,
      items: day.items.map((item) => ({
        startTime: toHourMinute(item.startTime),
        endTime: item.endTime ? toHourMinute(item.endTime) : null,
        title: item.title,
        host: item.host,
        location: item.location,
        virtualLink: item.virtualLink,
        category: item.category,
        competition: item.competition?.name ?? null,
        description: toPlainText(item.description),
      })),
    })),
  };
}
