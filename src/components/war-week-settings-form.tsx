"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { type SetupActionResult, updateWarWeekSettings } from "@/actions/setup";
import { OrganizerEmailChips } from "@/components/organizer-email-chips";
import { Button } from "@/components/ui/button";
import type { WarWeek } from "@/db/schema";
import type { WarWeekSettingsInput } from "@/lib/setup";
import { themeContrastWarnings, warWeekThemeStyle } from "@/lib/theme";

const fieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

type ColorField =
  | "primaryColor"
  | "primaryForegroundColor"
  | "accentColor"
  | "backgroundColor"
  | "foregroundColor";

const COLOR_FIELDS: { field: ColorField; label: string }[] = [
  { field: "primaryColor", label: "Primary" },
  { field: "primaryForegroundColor", label: "Primary text" },
  { field: "accentColor", label: "Accent" },
  { field: "backgroundColor", label: "Background" },
  { field: "foregroundColor", label: "Text" },
];

/** The color picker needs #rrggbb; expand #rgb and fall back to black. */
function pickerValue(hex: string): string {
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${[...value.slice(1)].map((d) => d + d).join("")}`.toLowerCase();
  }
  return "#000000";
}

/**
 * Edit the current War Week's settings and Appearance Theme. The theme
 * preview and contrast warnings update as you type; the server action does
 * the validation and guards, and its error is what's shown.
 */
export function WarWeekSettingsForm({
  initial,
  actorEmail,
}: {
  initial: WarWeekSettingsInput;
  /** The signed-in Organizer, whose own chip can't be removed. */
  actorEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);
  const [result, setResult] = useState<SetupActionResult | null>(null);

  const set =
    (field: keyof WarWeekSettingsInput) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setValues((v) => ({ ...v, [field]: event.target.value }));
      setResult(null);
    };

  const preview = {
    ...values,
    fontPreset: values.fontPreset as WarWeek["fontPreset"],
  };
  const warnings = themeContrastWarnings(preview);

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
      <input
        name={field}
        className={fieldClass}
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
        {text("startDate", "Start date", { type: "date", required: true })}
        {text("endDate", "End date", { type: "date", required: true })}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            name="status"
            className={fieldClass}
            value={values.status}
            onChange={set("status")}
          >
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="complete">Complete</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Mode
          <select
            name="mode"
            className={fieldClass}
            value={values.mode}
            onChange={set("mode")}
          >
            <option value="teams">Teams</option>
            <option value="free-for-all">Free-for-all</option>
          </select>
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
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${label} color picker`}
                  className="border-border h-9 w-10 shrink-0 rounded-md border"
                  value={pickerValue(values[field])}
                  onChange={set(field)}
                />
                <input
                  id={field}
                  name={field}
                  required
                  maxLength={32}
                  className={`${fieldClass} min-w-0 flex-1 font-mono`}
                  value={values[field]}
                  onChange={set(field)}
                />
              </div>
            </div>
          ))}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Font
            <select
              name="fontPreset"
              className={fieldClass}
              value={values.fontPreset}
              onChange={set("fontPreset")}
            >
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
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
