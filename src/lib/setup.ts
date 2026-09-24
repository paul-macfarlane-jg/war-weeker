import { type ZodType, z } from "zod";

import type { WarWeek } from "@/db/schema";
import { daySeedSchema, warWeekSettingsSeedShape as seed } from "@/seed/schema";

/** The War Week settings form's raw fields, all as the inputs hold them. */
export type WarWeekSettingsInput = {
  storyTheme: string;
  startDate: string;
  endDate: string;
  status: string;
  mode: string;
  teamLabel: string;
  leaderTitle: string;
  slackChannelUrl: string;
  wikiUrl: string;
  /** One or more emails, split on whitespace or commas. */
  organizerEmails: string;
  primaryColor: string;
  primaryForegroundColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  logoUrl: string;
  bannerUrl: string;
  fontPreset: string;
};

/** Validated settings, keyed by the `war_week` columns they update. */
export type WarWeekSettingsValues = Pick<
  WarWeek,
  | "storyTheme"
  | "startDate"
  | "endDate"
  | "status"
  | "mode"
  | "teamLabel"
  | "leaderTitle"
  | "slackChannelUrl"
  | "wikiUrl"
  | "organizerEmails"
  | "primaryColor"
  | "primaryForegroundColor"
  | "accentColor"
  | "backgroundColor"
  | "foregroundColor"
  | "logoUrl"
  | "bannerUrl"
  | "fontPreset"
>;

/** The form's starting fields from the War Week row. */
export function settingsInputFrom(warWeek: WarWeek): WarWeekSettingsInput {
  return {
    storyTheme: warWeek.storyTheme,
    startDate: warWeek.startDate,
    endDate: warWeek.endDate,
    status: warWeek.status,
    mode: warWeek.mode,
    teamLabel: warWeek.teamLabel,
    leaderTitle: warWeek.leaderTitle,
    slackChannelUrl: warWeek.slackChannelUrl,
    wikiUrl: warWeek.wikiUrl ?? "",
    organizerEmails: warWeek.organizerEmails.join("\n"),
    primaryColor: warWeek.primaryColor,
    primaryForegroundColor: warWeek.primaryForegroundColor,
    accentColor: warWeek.accentColor,
    backgroundColor: warWeek.backgroundColor,
    foregroundColor: warWeek.foregroundColor,
    logoUrl: warWeek.logoUrl ?? "",
    bannerUrl: warWeek.bannerUrl ?? "",
    fontPreset: warWeek.fontPreset,
  };
}

const trim = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

/** Trims, then applies the seed's rule for the field. */
export function trimmed<T extends ZodType>(schema: T) {
  return z.preprocess(trim, schema);
}

/** Trims, turns blank into null, then applies the seed's (nullish) rule. */
export function optional<T extends ZodType>(schema: T) {
  return z
    .preprocess((value) => trim(value) || null, schema)
    .transform((value) => value ?? null);
}

// Field rules come from the seed schema so seed and setup can't drift.
const settingsSchema = z
  .object({
    storyTheme: trimmed(seed.storyTheme),
    startDate: trimmed(seed.startDate),
    endDate: trimmed(seed.endDate),
    status: seed.status,
    mode: seed.mode,
    teamLabel: trimmed(seed.teamLabel),
    leaderTitle: trimmed(seed.leaderTitle),
    slackChannelUrl: trimmed(seed.slackChannelUrl),
    wikiUrl: optional(seed.wikiUrl),
    organizerEmails: seed.organizerEmails.min(1, {
      error: "Add at least one organizer email.",
    }),
    primaryColor: trimmed(seed.primary),
    primaryForegroundColor: trimmed(seed.primaryForeground),
    accentColor: trimmed(seed.accent),
    backgroundColor: trimmed(seed.background),
    foregroundColor: trimmed(seed.foreground),
    logoUrl: optional(seed.logoUrl),
    bannerUrl: optional(seed.bannerUrl),
    fontPreset: seed.fontPreset,
  })
  .refine((s) => s.startDate <= s.endDate, {
    error: "Start date must not be after the end date.",
    path: ["startDate"],
  });

const daySchema = z.object({
  date: trimmed(daySeedSchema.shape.date),
  dayTheme: trimmed(daySeedSchema.shape.dayTheme),
});

export type DayInput = { date: string; dayTheme: string };
export type DayValues = z.infer<typeof daySchema>;

const FIELD_LABELS: Record<string, string> = {
  storyTheme: "Story Theme",
  startDate: "Start date",
  endDate: "End date",
  status: "Status",
  mode: "Mode",
  teamLabel: "Team Label",
  leaderTitle: "Leader Title",
  slackChannelUrl: "Slack URL",
  wikiUrl: "Wiki URL",
  organizerEmails: "Organizer emails",
  primaryColor: "Primary color",
  primaryForegroundColor: "Primary text color",
  accentColor: "Accent color",
  backgroundColor: "Background color",
  foregroundColor: "Text color",
  logoUrl: "Logo URL",
  bannerUrl: "Banner URL",
  fontPreset: "Font",
  date: "Date",
  dayTheme: "Day Theme",
};

/** A zod issue worded as "must …", or null when it is already a sentence. */
function mustPhrase(issue: z.core.$ZodIssue): string | null {
  switch (issue.code) {
    case "too_small":
      return issue.origin === "string" ? "must not be empty" : null;
    case "too_big":
      return `must be at most ${issue.maximum} characters`;
    case "invalid_value":
      return `must be one of ${issue.values.join(", ")}`;
    case "invalid_format":
      if (issue.message.startsWith("must ")) return issue.message;
      if (issue.format === "url") return "must be an https URL";
      if (issue.format === "email") return "must be a valid email";
      if (issue.format === "date") return "must be a date";
      return null;
    case "invalid_type":
      return "must be filled in";
    default:
      return null;
  }
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Parses a setup form, worded as "<Field label> must …" from `labels`
 * (on top of the War Week and Day labels) unless `describe` words it.
 */
export function parseWith<T>(
  schema: ZodType<T>,
  input: unknown,
  describe: (issue: z.core.$ZodIssue) => string | null = () => null,
  labels: Record<string, string> = {},
): Parsed<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  const issue = result.error.issues[0];
  const special = describe(issue);
  if (special) return { ok: false, error: special };
  const field = String(issue.path[0]);
  const label = labels[field] ?? FIELD_LABELS[field];
  const phrase = mustPhrase(issue);
  return {
    ok: false,
    error: label && phrase ? `${label} ${phrase}.` : issue.message,
  };
}

/** Validates the War Week settings form. Never throws; returns the first error. */
export function parseWarWeekSettingsInput(
  input: WarWeekSettingsInput,
): Parsed<WarWeekSettingsValues> {
  const emails = [
    ...new Set(
      input.organizerEmails
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((email) => email.toLowerCase()),
    ),
  ];
  return parseWith(
    settingsSchema,
    { ...input, organizerEmails: emails },
    (issue) =>
      issue.path[0] === "organizerEmails" && typeof issue.path[1] === "number"
        ? `Organizer email "${emails[issue.path[1]]}" must be a valid email.`
        : null,
  );
}

/** Validates one Day's form. Never throws; returns the first error. */
export function parseDayInput(input: DayInput): Parsed<DayValues> {
  return parseWith(daySchema, input);
}

/**
 * Refuses a settings save that would leave the War Week inconsistent:
 * Teams in a free-for-all, Days outside its dates, or the saving Organizer
 * locked out. No cascading changes; the Organizer fixes it first.
 */
export function settingsGuardError(
  values: WarWeekSettingsValues,
  ctx: { actorEmail: string; teamCount: number; dayDates: string[] },
): string | null {
  if (!values.organizerEmails.includes(ctx.actorEmail.toLowerCase())) {
    return "You can't remove your own email from the organizer emails.";
  }
  if (values.mode === "free-for-all" && ctx.teamCount > 0) {
    const teams = ctx.teamCount === 1 ? "1 Team" : `${ctx.teamCount} Teams`;
    return `This War Week has ${teams}. Delete ${ctx.teamCount === 1 ? "it" : "them"} before switching to free-for-all.`;
  }
  const outside = [...ctx.dayDates]
    .sort()
    .find((date) => date < values.startDate || date > values.endDate);
  if (outside) {
    return `The Day on ${outside} falls outside the new dates. Move or delete it first.`;
  }
  return null;
}

/** Refuses a Day outside the War Week's dates or on a date already taken. */
export function dayGuardError(
  values: DayValues,
  ctx: { startDate: string; endDate: string; otherDayDates: string[] },
): string | null {
  if (values.date < ctx.startDate || values.date > ctx.endDate) {
    return `A Day must fall within the War Week (${ctx.startDate} to ${ctx.endDate}).`;
  }
  if (ctx.otherDayDates.includes(values.date)) {
    return `There's already a Day on ${values.date}.`;
  }
  return null;
}

/** Refuses deleting a Day that still has Schedule Items. */
export function dayDeleteGuardError(scheduleItemCount: number): string | null {
  if (scheduleItemCount === 0) return null;
  return scheduleItemCount === 1
    ? "This Day has 1 Schedule Item. Delete or move it first."
    : `This Day has ${scheduleItemCount} Schedule Items. Delete or move them first.`;
}
