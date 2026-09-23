import { z } from "zod";

const hexColor = z
  .string()
  .max(32)
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "must be a hex color");

const themeUrl = z
  .string()
  .max(500)
  .regex(
    /^(\/[^\s]*|https:\/\/[^\s]+)$/,
    "must be a root-relative path or an https URL",
  );

export const daySeedSchema = z.object({
  date: z.iso.date(),
  dayTheme: z.string().min(1).max(120),
});

export type DaySeed = z.infer<typeof daySeedSchema>;

export const warWeekSeedSchema = z
  .object({
    edition: z
      .string()
      .min(1)
      .max(8)
      .regex(/^[a-z]+$/, "must be a lowercase roman numeral"),
    editionNumber: z.number().int().positive(),
    year: z.number().int(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    storyTheme: z.string().min(1).max(120),
    status: z.enum(["upcoming", "live", "complete"]),
    mode: z.enum(["teams", "free-for-all"]),
    teamLabel: z.string().min(1).max(40),
    leaderTitle: z.string().min(1).max(40),
    slackChannelUrl: z.url().max(500),
    standingsHidden: z.boolean(),
    primary: hexColor,
    primaryForeground: hexColor,
    accent: hexColor,
    background: hexColor,
    foreground: hexColor,
    fontPreset: z.enum(["sans", "serif", "mono"]),
    logoUrl: themeUrl.nullish(),
    bannerUrl: themeUrl.nullish(),
    wikiUrl: themeUrl.nullish(),
    organizerEmails: z.array(z.string().max(254).toLowerCase().email()),
    winner: z.string().max(200).nullish(),
    highlights: z.array(z.string().max(500)).default([]),
    days: z.array(daySeedSchema),
  })
  .refine((seed) => seed.startDate <= seed.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  })
  .refine(
    (seed) =>
      seed.days.every(
        (d) => d.date >= seed.startDate && d.date <= seed.endDate,
      ),
    {
      message: "every day must fall within startDate and endDate",
      path: ["days"],
    },
  )
  .refine(
    (seed) => new Set(seed.days.map((d) => d.date)).size === seed.days.length,
    {
      message: "day dates must be unique",
      path: ["days"],
    },
  );

export type WarWeekSeed = z.infer<typeof warWeekSeedSchema>;
