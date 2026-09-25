import { format, parse } from "date-fns";

/** A `YYYY-MM-DD` date as a local calendar date (no UTC shift). */
export function parseDateValue(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** A local calendar date as `YYYY-MM-DD`. */
export function formatDateValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** "Mon, Sep 21, 2026". */
export function formatDateLabel(date: Date): string {
  return format(date, "EEE, MMM d, yyyy");
}
