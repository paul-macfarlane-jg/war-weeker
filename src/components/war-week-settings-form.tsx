"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { type SetupActionResult, updateWarWeekSettings } from "@/actions/setup";
import { ColorField, type ColorSwatch } from "@/components/color-field";
import { DateRangePicker } from "@/components/date-range-picker";
import { OptionSelect, type SelectOption } from "@/components/option-select";
import { OrganizerEmailChips } from "@/components/organizer-email-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WarWeek } from "@/db/schema";
import type { WarWeekSettingsInput } from "@/lib/setup";
import {
  themeContrastWarnings,
  themeSwatches,
  warWeekThemeStyle,
} from "@/lib/theme";

type ThemeColorField =
  | "primaryColor"
  | "primaryForegroundColor"
  | "accentColor"
  | "backgroundColor"
  | "foregroundColor";

const COLOR_FIELDS: { field: ThemeColorField; label: string }[] = [
  { field: "primaryColor", label: "Primary" },
  { field: "primaryForegroundColor", label: "Primary text" },
  { field: "accentColor", label: "Accent" },
  { field: "backgroundColor", label: "Background" },
  { field: "foregroundColor", label: "Text" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "complete", label: "Complete" },
];

const MODE_OPTIONS: SelectOption[] = [
  { value: "teams", label: "Teams" },
  { value: "free-for-all", label: "Free-for-all" },
];

const FONT_OPTIONS: SelectOption[] = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

/**
 * Edit the current War Week's settings and Appearance Theme. The theme
 * preview and contrast warnings update as you type; the server action does
 * the validation and guards, and its error is what's shown.
 */
export function WarWeekSettingsForm({
  initial,
  actorEmail,
  dayDates,
  teamSwatches,
}: {
  initial: WarWeekSettingsInput;
  /** The signed-in Organizer, whose own chip can't be removed. */
  actorEmail: string;
  /** The War Week's existing Day dates, `YYYY-MM-DD`. */
  dayDates: string[];
  /** The War Week's Team colors, offered as color swatches. */
  teamSwatches: ColorSwatch[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<SetupActionResult | null>(null);

  function setValue(field: keyof WarWeekSettingsInput, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setResult(null);
  }
  const set =
    (field: keyof WarWeekSettingsInput) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setValue(field, event.target.value);

  const preview = {
    ...values,
    fontPreset: values.fontPreset as WarWeek["fontPreset"],
  };
  const warnings = themeContrastWarnings(preview);
  const swatches = [...themeSwatches(values), ...teamSwatches];

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const saved = await updateWarWeekSettings(values);
      setResult(saved);
      if (saved.ok) router.refresh();
    });
  }

  const text = (
    field: keyof WarWeekSettingsInput,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <Input
        name={field}
        className="h-11 sm:h-9"
        value={values[field]}
        onChange={set(field)}
        {...props}
      />
    </label>
  );

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6"
      aria-label="War Week settings"
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Story</legend>
        <div className="sm:col-span-2">
          {text("storyTheme", "Story Theme", {
            required: true,
            maxLength: 120,
          })}
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          <label htmlFor="warWeekDates">Dates</label>
          <DateRangePicker
            id="warWeekDates"
            startName="startDate"
            endName="endDate"
            value={{ start: values.startDate, end: values.endDate }}
            days={dayDates}
            onValueChange={({ start, end }) => {
              setValues((v) => ({ ...v, startDate: start, endDate: end }));
              setResult(null);
            }}
          />
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <OptionSelect
            name="status"
            options={STATUS_OPTIONS}
            value={values.status}
            onValueChange={(status) => setValue("status", status)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Mode
          <OptionSelect
            name="mode"
            options={MODE_OPTIONS}
            value={values.mode}
            onValueChange={(mode) => setValue("mode", mode)}
          />
        </label>
        {text("teamLabel", "Team Label", { required: true, maxLength: 40 })}
        {text("leaderTitle", "Leader Title", { required: true, maxLength: 40 })}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-base font-semibold">Links</legend>
        {text("slackChannelUrl", "Slack URL", { type: "url", required: true })}
        {text("wikiUrl", "Wiki URL", { placeholder: "Optional" })}
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 text-base font-semibold">Organizers</legend>
        <OrganizerEmailChips
          value={values.organizerEmails}
          actorEmail={actorEmail}
          onChange={(organizerEmails) => {
            setValues((v) => ({ ...v, organizerEmails }));
            setResult(null);
          }}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-base font-semibold">
          Appearance Theme
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_FIELDS.map(({ field, label }) => (
            <div key={field} className="flex flex-col gap-1 text-sm">
              <label htmlFor={field} className="font-medium">
                {label} color
              </label>
              <ColorField
                id={field}
                name={field}
                value={values[field]}
                swatches={swatches}
                onValueChange={(hex) => setValue(field, hex)}
              />
            </div>
          ))}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Font
            <OptionSelect
              name="fontPreset"
              options={FONT_OPTIONS}
              value={values.fontPreset}
              onValueChange={(font) => setValue("fontPreset", font)}
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("logoUrl", "Logo URL", {
            placeholder: "/themes/… or https://…",
          })}
          {text("bannerUrl", "Banner URL", {
            placeholder: "/themes/… or https://…",
          })}
        </div>

        <div
          aria-label="Theme preview"
          style={warWeekThemeStyle(preview)}
          className="bg-background text-foreground border-border flex flex-col gap-3 rounded-lg border p-4 font-sans"
        >
          <span className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
            Preview
          </span>
          <p className="text-primary text-xl font-semibold">
            {values.storyTheme || "Story Theme"}
          </p>
          <p className="text-sm">Body text on the background.</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-medium">
              Primary button
            </span>
            <span className="bg-accent text-accent-foreground rounded-lg px-3 py-1.5 text-sm font-medium">
              Accent
            </span>
          </div>
        </div>
        {warnings.length > 0 && (
          <ul
            aria-label="Contrast warnings"
            className="flex flex-col gap-1 text-sm text-amber-700 dark:text-amber-400"
          >
            {warnings.map((warning) => (
              <li key={warning}>⚠ {warning}</li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {result && !pending && (
          <p
            role={result.ok ? "status" : "alert"}
            className={result.ok ? "text-sm" : "text-destructive text-sm"}
          >
            {result.ok ? "Saved." : result.error}
          </p>
        )}
      </div>
    </form>
  );
}
