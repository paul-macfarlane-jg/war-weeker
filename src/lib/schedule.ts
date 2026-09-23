import type { Day, ScheduleItem } from "@/db/schema";

export const WAR_WEEK_TIME_ZONE = "America/New_York";

/**
 * How long a Schedule Item with no end time counts as "on now". Items are
 * stored without a duration, so this is a display rule only (see
 * CONTEXT.md, Schedule display rules).
 */
const DEFAULT_DURATION_SECONDS = 60 * 60;

const SECONDS_PER_DAY = 24 * 60 * 60;

export type ScheduleEntry = Pick<
  ScheduleItem,
  | "id"
  | "startTime"
  | "endTime"
  | "title"
  | "host"
  | "location"
  | "virtualLink"
  | "description"
  | "category"
> & { competition: { id: string; name: string } | null };

export type ScheduleDay = Pick<Day, "id" | "date" | "dayTheme"> & {
  items: ScheduleEntry[];
};

/** An ET wall-clock reading: `YYYY-MM-DD` and `HH:MM:SS`. */
export type EasternClock = { date: string; time: string };

export type NowNext = {
  /** The Day whose date is today in ET, if today is in the War Week. */
  today: ScheduleDay | null;
  /** True until the first Day's date arrives in ET. */
  beforeStart: boolean;
  /** Items on right now, in time order. */
  now: ScheduleEntry[];
  /** Every item sharing the earliest start after now, on whichever Day. */
  next: { date: string; items: ScheduleEntry[] } | null;
};

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: WAR_WEEK_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Reads an instant on the ET wall clock, whatever the host's timezone. */
export function toEasternClock(instant: Date): EasternClock {
  const parts = Object.fromEntries(
    clockFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function compareItems(a: ScheduleEntry, b: ScheduleEntry): number {
  return (
    a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title)
  );
}

/**
 * Groups Schedule Items under their Days: Days by date, each Day's items by
 * start time then title.
 */
export function groupSchedule(
  days: Pick<Day, "id" | "date" | "dayTheme">[],
  items: { dayId: string; entry: ScheduleEntry }[],
): ScheduleDay[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      id: day.id,
      date: day.date,
      dayTheme: day.dayTheme,
      items: items
        .filter((item) => item.dayId === day.id)
        .map((item) => item.entry)
        .sort(compareItems),
    }));
}

/** `HH:MM[:SS]` to seconds since midnight. */
function toSeconds(time: string): number {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * An item's span in seconds from its Day's midnight. An end time at or
 * before the start time runs past midnight into the next calendar day.
 */
function span(item: ScheduleEntry): { start: number; end: number } {
  const start = toSeconds(item.startTime);
  if (!item.endTime) return { start, end: start + DEFAULT_DURATION_SECONDS };
  const end = toSeconds(item.endTime);
  return { start, end: end <= start ? end + SECONDS_PER_DAY : end };
}

/** The `YYYY-MM-DD` date before `date`. */
function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function isOnAt(item: ScheduleEntry, seconds: number): boolean {
  const { start, end } = span(item);
  return start <= seconds && seconds < end;
}

/**
 * Works out today's Day and what's on now and next, all on the ET wall
 * clock. `days` must be in the order `groupSchedule` returns.
 */
export function computeNowNext(days: ScheduleDay[], at: Date): NowNext {
  const clock = toEasternClock(at);
  const nowSeconds = toSeconds(clock.time);
  const today = days.find((day) => day.date === clock.date) ?? null;
  const yesterday = days.find((day) => day.date === previousDate(clock.date));

  // Yesterday's items that run past midnight are still on; measure them
  // from yesterday's midnight.
  const now = [
    ...(yesterday?.items ?? []).filter((item) =>
      isOnAt(item, nowSeconds + SECONDS_PER_DAY),
    ),
    ...(today?.items ?? []).filter((item) => isOnAt(item, nowSeconds)),
  ];

  let next: NowNext["next"] = null;
  for (const day of days) {
    if (day.date < clock.date) continue;
    const upcoming = day.items.filter(
      (item) => day.date > clock.date || toSeconds(item.startTime) > nowSeconds,
    );
    if (upcoming.length > 0) {
      const start = upcoming[0].startTime;
      next = {
        date: day.date,
        items: upcoming.filter((item) => item.startTime === start),
      };
      break;
    }
  }

  const beforeStart = days.length > 0 && clock.date < days[0].date;
  return { today, beforeStart, now, next };
}

/** `HH:MM[:SS]` (an ET wall-clock time) as `7:05 AM`. */
export function formatEtTime(time: string): string {
  const totalMinutes = Math.floor(toSeconds(time) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  const period = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
}

/** An item's times as `7:00 AM ET` or `6:00 PM – 10:00 PM ET`. */
export function formatTimeRange(
  item: Pick<ScheduleEntry, "startTime" | "endTime">,
): string {
  const start = formatEtTime(item.startTime);
  return item.endTime
    ? `${start} – ${formatEtTime(item.endTime)} ET`
    : `${start} ET`;
}

const dayHeadingFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** A Day's `YYYY-MM-DD` date as `Monday, Feb 23`. */
export function formatDayHeading(date: string): string {
  return dayHeadingFormatter.format(new Date(`${date}T00:00:00Z`));
}

/**
 * The clock pages compute now/next from: the `?at=` search param when it is
 * a parseable instant (for demos of a War Week that isn't on right now),
 * otherwise the real time.
 */
export function resolveClock(at: string | string[] | undefined): Date {
  if (typeof at === "string") {
    const parsed = new Date(at);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
