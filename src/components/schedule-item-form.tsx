"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type SetupScheduleFaqActionResult,
  createScheduleItem,
  updateScheduleItem,
} from "@/actions/setup-schedule-faq";
import { EntityCombobox } from "@/components/entity-combobox";
import { OptionSelect } from "@/components/option-select";
import { RichTextEditor } from "@/components/rich-text-editor";
import { TimeCombobox } from "@/components/time-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleItem } from "@/db/schema";
import type { Content } from "@/lib/rich-text/content";
import { formatDayHeading } from "@/lib/schedule";
import type { ScheduleItemInput } from "@/lib/setup-schedule-faq";

const CATEGORIES = [
  { value: "competition", label: "Competition" },
  { value: "education", label: "Education" },
  { value: "social", label: "Social" },
  { value: "meal", label: "Meal" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
] as const satisfies ReadonlyArray<{
  value: ScheduleItem["category"];
  label: string;
}>;

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
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        set(key, event.target.value),
    };
  }

  /** Name, value and change wiring for a custom control. */
  function control(key: Exclude<keyof ScheduleItemInput, "description">) {
    return {
      name: key,
      value: fields[key],
      onValueChange: (value: string) => set(key, value),
    };
  }

  const dayOptions = days.map((day) => ({
    value: day.id,
    label: `${formatDayHeading(day.date)} · ${day.dayTheme}`,
  }));
  const competitionItems = [
    { id: "", label: "No Competition" },
    ...competitions.map((competition) => ({
      id: competition.id,
      label: competition.name,
    })),
  ];

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
          <OptionSelect required options={dayOptions} {...control("dayId")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start time (ET)
          <TimeCombobox required {...control("startTime")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End time (ET, optional)
          <TimeCombobox start={fields.startTime} {...control("endTime")} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <Input
          required
          maxLength={200}
          className="h-11 sm:h-9"
          {...text("title")}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Category
          <OptionSelect
            required
            options={CATEGORIES}
            {...control("category")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Competition (optional)
          <EntityCombobox
            items={competitionItems}
            placeholder="No Competition"
            {...control("competitionId")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Host (optional)
          <Input maxLength={200} className="h-11 sm:h-9" {...text("host")} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Location (optional)
          <Input
            maxLength={200}
            className="h-11 sm:h-9"
            {...text("location")}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Virtual link (optional)
        <Input
          type="url"
          maxLength={500}
          placeholder="https://"
          className="h-11 sm:h-9"
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
