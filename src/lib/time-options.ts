/**
 * Pure helpers for the time field: reading what an organizer types, showing
 * a 24-hour `HH:MM` value on the 12-hour clock, and the 5-minute option list.
 */

export type TimeOption = { value: string; label: string };

const TIME_PATTERN = /^(\d{1,2})(?::?(\d{2}))?(am|pm|a|p)?$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Reads a typed time ("7:30p", "7:30 pm", "730pm", "19:30", "7p", "12am")
 * as `HH:MM` on the 24-hour clock, or null when it isn't a time. With no
 * am/pm the hours are read as 24-hour ("7" is 07:00, "19" is 19:00).
 */
export function parseTime(input: string): string | null {
  const text = input.toLowerCase().replace(/[\s.]/g, "");
  const match = TIME_PATTERN.exec(text);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3]?.[0];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

/** "19:30" as "7:30 PM"; "00:05" as "12:05 AM". */
export function formatTime12(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${hours < 12 ? "AM" : "PM"}`;
}

/** "45m", "1h", "1h 30m" from start to end; null when end isn't after start. */
export function durationLabel(start: string, end: string): string | null {
  const total = toMinutes(end) - toMinutes(start);
  if (total <= 0) return null;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Every 5 minutes from 00:00 to 23:55. Given a start time, options after it
 * carry the duration ("8:30 PM · 1h") so an end time is easy to pick.
 */
export function timeOptions(start?: string): TimeOption[] {
  const options: TimeOption[] = [];
  for (let total = 0; total < 24 * 60; total += 5) {
    const value = `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
    const duration = start ? durationLabel(start, value) : null;
    const label = formatTime12(value);
    options.push({ value, label: duration ? `${label} · ${duration}` : label });
  }
  return options;
}
