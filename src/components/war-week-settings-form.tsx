"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateWarWeekSettings } from "@/actions/setup";
import { ColorField, type ColorSwatch } from "@/components/color-field";
import { DateRangePicker } from "@/components/date-range-picker";
import { OptionSelect, type SelectOption } from "@/components/option-select";
import { OrganizerEmailChips } from "@/components/organizer-email-chips";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
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
  const [error, setError] = useState<string | null>(null);

  function setValue(field: keyof WarWeekSettingsInput, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setError(null);
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
      if (saved.ok) {
        setError(null);
        toast.success("War Week settings saved");
        router.refresh();
      } else {
        setError(saved.error);
        toast.error(saved.error);
      }
    });
  }

  const text = (
    field: keyof WarWeekSettingsInput,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field>
      <FieldLabel htmlFor={`settings-${field}`}>{label}</FieldLabel>
      <Input
        id={`settings-${field}`}
        name={field}
        className="h-11 sm:h-9"
        value={values[field]}
        onChange={set(field)}
        {...props}
      />
    </Field>
  );

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-6"
      aria-label="War Week settings"
    >
      <FieldSet>
        <FieldLegend className="mb-2 font-semibold">Story</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {text("storyTheme", "Story Theme", {
              required: true,
              maxLength: 120,
            })}
          </div>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="warWeekDates">Dates</FieldLabel>
            <DateRangePicker
              id="warWeekDates"
              startName="startDate"
              endName="endDate"
              value={{ start: values.startDate, end: values.endDate }}
              days={dayDates}
              onValueChange={({ start, end }) => {
                setValues((v) => ({ ...v, startDate: start, endDate: end }));
                setError(null);
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-status">Status</FieldLabel>
            <OptionSelect
              id="settings-status"
              name="status"
              options={STATUS_OPTIONS}
              value={values.status}
              onValueChange={(status) => setValue("status", status)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-mode">Mode</FieldLabel>
            <OptionSelect
              id="settings-mode"
              name="mode"
              options={MODE_OPTIONS}
              value={values.mode}
              onValueChange={(mode) => setValue("mode", mode)}
            />
          </Field>
          {text("teamLabel", "Team Label", { required: true, maxLength: 40 })}
          {text("leaderTitle", "Leader Title", {
            required: true,
            maxLength: 40,
          })}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="mb-2 font-semibold">Links</FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {text("slackChannelUrl", "Slack URL", {
            type: "url",
            required: true,
          })}
          {text("wikiUrl", "Wiki URL", { placeholder: "Optional" })}
        </FieldGroup>
      </FieldSet>

      <FieldSet className="min-w-0">
        <FieldLegend className="mb-2 font-semibold">Organizers</FieldLegend>
        <FieldGroup>
          <OrganizerEmailChips
            value={values.organizerEmails}
            actorEmail={actorEmail}
            onChange={(organizerEmails) => {
              setValues((v) => ({ ...v, organizerEmails }));
              setError(null);
            }}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend className="mb-2 font-semibold">
          Appearance Theme
        </FieldLegend>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COLOR_FIELDS.map(({ field, label }) => (
            <Field key={field}>
              <FieldLabel htmlFor={field}>{label} color</FieldLabel>
              <ColorField
                id={field}
                name={field}
                value={values[field]}
                swatches={swatches}
                onValueChange={(hex) => setValue(field, hex)}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel htmlFor="settings-fontPreset">Font</FieldLabel>
            <OptionSelect
              id="settings-fontPreset"
              name="fontPreset"
              options={FONT_OPTIONS}
              value={values.fontPreset}
              onValueChange={(font) => setValue("fontPreset", font)}
            />
          </Field>
        </FieldGroup>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          {text("logoUrl", "Logo URL", {
            placeholder: "/themes/… or https://…",
          })}
          {text("bannerUrl", "Banner URL", {
            placeholder: "/themes/… or https://…",
          })}
        </FieldGroup>

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
      </FieldSet>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </div>
        <FieldError>{pending ? null : error}</FieldError>
      </div>
    </form>
  );
}
