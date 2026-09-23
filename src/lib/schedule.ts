import type { Day, ScheduleItem } from "@/db/schema";

export const WAR_WEEK_TIME_ZONE = "America/New_York";

/**
 * How long a Schedule Item with no end time counts as "on now". Items are
 * stored without a duration, so this is a display rule only.
 */
const DEFAULT_DURATION_MINUTES = 60;

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

function toEntry(item: ScheduleEntry & { dayId: string }): ScheduleEntry {
  return {
    id: item.id,
    startTime: item.startTime,
    endTime: item.endTime,
    title: item.title,
    host: item.host,
    location: item.location,
    virtualLink: item.virtualLink,
    description: item.description,
    category: item.category,
    competition: item.competition,
  };
}

/**
 * Groups Schedule Items under their Days: Days by date, each Day's items by
 * start time then title.
 */
export function groupSchedule(
  days: Pick<Day, "id" | "date" | "dayTheme">[],
  items: (ScheduleEntry & { dayId: string })[],
): ScheduleDay[] {
  return [...days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      id: d.id,
      date: d.date,
      dayTheme: d.dayTheme,
      items: items
        .filter((item) => item.dayId === d.id)
        .map(toEntry)
        .sort(compareItems),
    }));
}

/** `HH:MM[:SS]` to minutes since midnight. */
function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toSeconds(time: string): number {
  const [hours, minutes, seconds = 0] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function isOnNow(item: ScheduleEntry, nowSeconds: number): boolean {
  const start = toSeconds(item.startTime);
  const end = item.endTime
    ? toSeconds(item.endTime)
    : start + DEFAULT_DURATION_MINUTES * 60;
  return start <= nowSeconds && nowSeconds < end;
}

/**
 * Works out today's Day and what's on now and next, all on the ET wall
 * clock. `days` must be in the order `groupSchedule` returns.
 */
export function computeNowNext(days: ScheduleDay[], at: Date): NowNext {
  const clock = toEasternClock(at);
  const nowSeconds = toSeconds(clock.time);
  const today = days.find((d) => d.date === clock.date) ?? null;

  const now = today
    ? today.items.filter((item) => isOnNow(item, nowSeconds))
    : [];

  let next: NowNext["next"] = null;
  for (const d of days) {
    if (d.date < clock.date) continue;
    const upcoming = d.items.filter(
      (item) => d.date > clock.date || toSeconds(item.startTime) > nowSeconds,
    );
    if (upcoming.length > 0) {
      const start = upcoming[0].startTime;
      next = {
        date: d.date,
        items: upcoming.filter((item) => item.startTime === start),
      };
      break;
    }
  }

  return { today, now, next };
}

/** `HH:MM[:SS]` (an ET wall-clock time) as `7:05 AM`. */
export function formatEtTime(time: string): string {
  const total = toMinutes(time);
  const hours = Math.floor(total / 60);
  const minutes = String(total % 60).padStart(2, "0");
  const period = hours < 12 ? "AM" : "PM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
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
