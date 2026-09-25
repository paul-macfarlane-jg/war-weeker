"use client";

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

type DatePickerProps = {
  name: string;
  /** `YYYY-MM-DD`, or "" for no date. */
  value: string;
  onValueChange: (value: string) => void;
  /** Earliest pickable date, `YYYY-MM-DD`. */
  min?: string;
  /** Latest pickable date, `YYYY-MM-DD`. */
  max?: string;
  required?: boolean;
  id?: string;
  "aria-label"?: string;
};

/**
 * A date field: a button showing the date that opens a calendar. Posts
 * `YYYY-MM-DD` under `name`, like `<input type="date">` did.
 */
export function DatePicker({
  name,
  value,
  onValueChange,
  min,
  max,
  required,
  id,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);
  const minDate = min ? parseDateValue(min) : undefined;
  const maxDate = max ? parseDateValue(max) : undefined;
  const disabled: Matcher[] = [];
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  return (
    <span className="relative flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-label={ariaLabel}
              className="h-11 w-full justify-start font-normal sm:h-9 sm:w-auto sm:min-w-44"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {selected ? (
            formatDateLabel(selected)
          ) : (
            <span className="text-muted-foreground">Pick a date</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto max-w-[calc(100vw-2rem)] p-0"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? minDate}
            disabled={disabled}
            onSelect={(date) => {
              if (date) onValueChange(formatDateValue(date));
              setOpen(false);
            }}
            className="[--cell-size:--spacing(11)] sm:[--cell-size:--spacing(8)]"
          />
        </PopoverContent>
      </Popover>
      <input
        name={name}
        value={value}
        onChange={() => {}}
        required={required}
        tabIndex={-1}
        aria-hidden
        type={required ? "text" : "hidden"}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      />
    </span>
  );
}
