"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type SetupActionResult,
  createDay,
  deleteDay,
  updateDay,
} from "@/actions/setup";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SetupDay } from "@/queries/setup";

/**
 * One Day's date and Day Theme, saved on its own. With no `day` it's the
 * "Add a Day" row. The server action checks the date and the Schedule Item
 * guard; its error is what's shown.
 */
function DayRow({
  day,
  startDate,
  endDate,
}: {
  day?: SetupDay;
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(day?.date ?? "");
  const [dayTheme, setDayTheme] = useState(day?.dayTheme ?? "");
  const [result, setResult] = useState<SetupActionResult | null>(null);
  const label = day ? `Day ${day.date}` : "New Day";

  function run(action: () => Promise<SetupActionResult>) {
    startTransition(async () => {
      const saved = await action();
      setResult(saved);
      if (!saved.ok) return;
      if (!day) {
        setDate("");
        setDayTheme("");
      }
      router.refresh();
    });
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { date, dayTheme };
    run(() => (day ? updateDay(day.id, input) : createDay(input)));
  }

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <form
        onSubmit={submit}
        aria-label={label}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Date
          <DatePicker
            name="date"
            required
            min={startDate}
            max={endDate}
            value={date}
            onValueChange={setDate}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Day Theme
          <Input
            name="dayTheme"
            required
            maxLength={120}
            className="h-11 sm:h-9"
            value={dayTheme}
            onChange={(event) => setDayTheme(event.target.value)}
          />
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Saving…" : day ? "Save" : "Add Day"}
          </Button>
          {day && (
            <Button
              type="button"
              variant="destructive"
              size="lg"
              disabled={pending}
              onClick={() => {
                if (!window.confirm(`Delete the Day on ${day.date}?`)) return;
                run(() => deleteDay(day.id));
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </form>
      {day && (
        <p className="text-foreground/60 mt-1 text-xs">
          {day.scheduleItemCount === 1
            ? "1 Schedule Item"
            : `${day.scheduleItemCount} Schedule Items`}
        </p>
      )}
      {result && !result.ok && !pending && (
        <p role="alert" className="text-destructive mt-1 text-sm">
          {result.error}
        </p>
      )}
    </li>
  );
}

/** The War Week's Days in date order, each editable, plus an add row. */
export function DaysEditor({
  days,
  startDate,
  endDate,
}: {
  days: SetupDay[];
  startDate: string;
  endDate: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {days.length === 0 ? (
        <p className="text-foreground/70 text-sm">No Days yet.</p>
      ) : (
        <ul aria-label="Days">
          {days.map((day) => (
            // Keyed on the saved values so a refresh resets the row's fields.
            <DayRow
              key={`${day.id}-${day.date}-${day.dayTheme}`}
              day={day}
              startDate={startDate}
              endDate={endDate}
            />
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Add a Day</h2>
        <ul>
          <DayRow startDate={startDate} endDate={endDate} />
        </ul>
      </section>
    </div>
  );
}
