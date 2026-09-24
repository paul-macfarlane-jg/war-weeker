import { format, parseISO } from "date-fns";

import type { WarWeek } from "@/db/schema";

export const WAR_WEEK_STATUS_LABEL: Record<WarWeek["status"], string> = {
  live: "Live now",
  upcoming: "Upcoming",
  complete: "Complete",
};

/** "Feb 22 – Feb 27, 2026" from a War Week's `YYYY-MM-DD` dates. */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = format(parseISO(startDate), "MMM d");
  const end = format(parseISO(endDate), "MMM d, yyyy");
  return `${start} – ${end}`;
}
