"use client";

import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { type DateRange, getDefaultClassNames } from "react-day-picker";

import {
  formatDateLabel,
  formatDateValue,
  parseDateValue,
} from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dayOutsideRangeError } from "@/lib/setup";

// Tailwind's `sm` breakpoint: two months side by side from here up.
const WIDE_QUERY = "(min-width: 40rem)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

type DateRangeValue = { start: string; end: string };

type DateRangePickerProps = {
  startName: string;
  endName: string;
  /** Both `YYYY-MM-DD`, or "". */
  value: DateRangeValue;
  onValueChange: (value: DateRangeValue) => void;
  /** The War Week's existing Day dates, `YYYY-MM-DD`. */
  days: string[];
  id?: string;
  "aria-label"?: string;
};

const dotClass =
  "before:pointer-events-none before:absolute before:bottom-1 before:left-1/2 before:z-20 before:size-1 before:-translate-x-1/2 before:rounded-full";

/**
 * The War Week's start and end dates as one calendar range. Existing Days
 * show as dots. A range that would leave a Day outside it is refused with
 * the same text the settings save shows, and those Days are marked.
 * Posts both dates (`YYYY-MM-DD`) under `startName` and `endName`.
 */
export function DateRangePicker({
  startName,
  endName,
  value,
  onValueChange,
  days,
  id,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const wide = useWide();
  const [open, setOpen] = useState(false);
  // A half-picked or refused range stays on screen until the next pick;
  // only an accepted range reaches `onValueChange`.
  const [pending, setPending] = useState<DateRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  const from = parseDateValue(value.start);
  const to = parseDateValue(value.end);
  const selected: DateRange | undefined =
    pending ?? (from ? { from, to } : undefined);

  const outsideDates = new Set<string>();
  if (error && pending?.from && pending.to) {
    const start = formatDateValue(pending.from);
    const end = formatDateValue(pending.to);
    for (const day of days) {
      if (day < start || day > end) outsideDates.add(day);
    }
  }
  const toDates = (dates: string[]) =>
    dates.flatMap((date) => parseDateValue(date) ?? []);

  function openChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPending(null);
      setError(null);
    }
  }

  function select(range: DateRange | undefined) {
    setError(null);
    if (!range?.from || !range.to) {
      // One end picked so far: hold it until the other end is picked.
      setPending(range ?? null);
      return;
    }
    const next = {
      start: formatDateValue(range.from),
      end: formatDateValue(range.to),
    };
    const refusal = dayOutsideRangeError(days, next.start, next.end);
    if (refusal) {
      setPending(range);
      setError(refusal);
      return;
    }
    setPending(null);
    onValueChange(next);
    setOpen(false);
  }

  return (
    <span className="relative flex">
      <Popover open={open} onOpenChange={openChange}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-label={ariaLabel}
              className="h-11 w-full justify-start font-normal sm:h-9 sm:w-auto"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {from ? (
            <span className="truncate">
              {formatDateLabel(from)} – {to ? formatDateLabel(to) : "…"}
            </span>
          ) : (
            <span className="text-muted-foreground">Pick the dates</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-2rem)] p-0"
        >
          <Calendar
            mode="range"
            numberOfMonths={wide ? 2 : 1}
            selected={selected}
            defaultMonth={from}
            onSelect={select}
            modifiers={{
              hasDay: toDates(days.filter((day) => !outsideDates.has(day))),
              dayOutside: toDates([...outsideDates]),
            }}
            modifiersClassNames={{
              hasDay: cn(dotClass, "before:bg-foreground/60"),
              dayOutside: cn(dotClass, "before:size-1.5 before:bg-destructive"),
            }}
            classNames={{
              months: cn(
                "relative flex flex-col gap-4 sm:flex-row",
                getDefaultClassNames().months,
              ),
            }}
            className="[--cell-size:--spacing(11)] sm:[--cell-size:--spacing(8)]"
          />
          {error && (
            <p
              role="alert"
              className="text-destructive max-w-[calc(100vw-2rem)] px-3 pb-3 text-sm sm:max-w-md"
            >
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>
      <input type="hidden" name={startName} value={value.start} />
      <input type="hidden" name={endName} value={value.end} />
    </span>
  );
}
