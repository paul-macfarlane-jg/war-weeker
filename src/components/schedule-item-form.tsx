"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type SetupScheduleFaqActionResult,
  createScheduleItem,
  updateScheduleItem,
} from "@/actions/setup-schedule-faq";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import type { Content } from "@/lib/rich-text/content";
import { formatDayHeading } from "@/lib/schedule";
import type { ScheduleItemInput } from "@/lib/setup-schedule-faq";

const fieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

const CATEGORIES = [
  ["competition", "Competition"],
  ["education", "Education"],
  ["social", "Social"],
  ["meal", "Meal"],
  ["work", "Work"],
] as const;

const EMPTY: ScheduleItemInput = {
  dayId: "",
  startTime: "",
  endTime: "",
  title: "",
  host: "",
  location: "",
  virtualLink: "",
  category: "social",
  competitionId: "",
  description: { type: "doc", content: [] },
};

const BACK = "/admin/setup/schedule";

/**
 * Add or edit one Schedule Item. Times are ET wall-clock times on the chosen
 * Day. The server action checks the times, the Day and the (Day, start time,
 * title) key; its error is what's shown.
 */
export function ScheduleItemForm({
  itemId,
  initial,
  days,
  competitions,
}: {
  /** Set when editing an existing Schedule Item. */
  itemId?: string;
  initial?: ScheduleItemInput;
  days: { id: string; date: string; dayTheme: string }[];
  competitions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState<ScheduleItemInput>(
    initial ?? { ...EMPTY, dayId: days[0]?.id ?? "" },
  );
  const [result, setResult] = useState<SetupScheduleFaqActionResult | null>(
    null,
  );

  function set<K extends keyof ScheduleItemInput>(
    key: K,
    value: ScheduleItemInput[K],
  ) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function text(key: Exclude<keyof ScheduleItemInput, "description">) {
    return {
      name: key,
      value: fields[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      ) => set(key, event.target.value),
    };
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const saved = itemId
        ? await updateScheduleItem(itemId, fields)
        : await createScheduleItem(fields);
      setResult(saved);
      if (!saved.ok) return;
      router.push(BACK);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label="Schedule Item"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Day
          <select required className={fieldClass} {...text("dayId")}>
            {days.map((day) => (
              <option key={day.id} value={day.id}>
                {formatDayHeading(day.date)} · {day.dayTheme}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start time (ET)
          <input
            type="time"
            required
            className={fieldClass}
            {...text("startTime")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End time (ET, optional)
          <input type="time" className={fieldClass} {...text("endTime")} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input
          required
          maxLength={200}
          className={fieldClass}
          {...text("title")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <select required className={fieldClass} {...text("category")}>
            {CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Competition (optional)
          <select className={fieldClass} {...text("competitionId")}>
            <option value="">None</option>
            {competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Host (optional)
          <input maxLength={200} className={fieldClass} {...text("host")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Location (optional)
          <input maxLength={200} className={fieldClass} {...text("location")} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Virtual link (optional)
        <input
          type="url"
          maxLength={500}
          placeholder="https://"
          className={fieldClass}
          {...text("virtualLink")}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Description (optional)</span>
        <RichTextEditor
          content={fields.description as Content}
          onChange={(description) => set("description", description)}
          label="Description"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : itemId ? "Save changes" : "Add Schedule Item"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(BACK)}
        >
          Cancel
        </Button>
        {result && !result.ok && !pending && (
          <p role="alert" className="text-destructive text-sm">
            {result.error}
          </p>
        )}
      </div>
    </form>
  );
}
