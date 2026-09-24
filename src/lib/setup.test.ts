import { describe, expect, it } from "vitest";

import {
  type WarWeekSettingsInput,
  dayDeleteGuardError,
  dayGuardError,
  parseDayInput,
  parseWarWeekSettingsInput,
  settingsGuardError,
} from "@/lib/setup";

const input: WarWeekSettingsInput = {
  storyTheme: "  The Matrix ",
  startDate: "2026-02-22",
  endDate: "2026-02-27",
  status: "live",
  mode: "teams",
  teamLabel: "Team",
  leaderTitle: "Captain",
  slackChannelUrl: "https://jahnelgroup.slack.com/archives/war-week-xi",
  wikiUrl: "",
  organizerEmails: "PMacfarlane@jahnelgroup.com\njason@jahnelgroup.com, ",
  primaryColor: "#00ff41",
  primaryForegroundColor: "#000000",
  accentColor: "#008f11",
  backgroundColor: "#000",
  foregroundColor: "#d1ffd6",
  logoUrl: "/themes/xi/logo.svg",
  bannerUrl: " ",
  fontPreset: "mono",
};

function parsed(overrides: Partial<WarWeekSettingsInput> = {}) {
  return parseWarWeekSettingsInput({ ...input, ...overrides });
}

describe("parseWarWeekSettingsInput", () => {
  it("trims text, blanks optional URLs to null and splits organizer emails", () => {
    expect(parsed()).toEqual({
      ok: true,
      value: {
        storyTheme: "The Matrix",
        startDate: "2026-02-22",
        endDate: "2026-02-27",
        status: "live",
        mode: "teams",
        teamLabel: "Team",
        leaderTitle: "Captain",
        slackChannelUrl: "https://jahnelgroup.slack.com/archives/war-week-xi",
        wikiUrl: null,
        organizerEmails: [
          "pmacfarlane@jahnelgroup.com",
          "jason@jahnelgroup.com",
        ],
        primaryColor: "#00ff41",
        primaryForegroundColor: "#000000",
        accentColor: "#008f11",
        backgroundColor: "#000",
        foregroundColor: "#d1ffd6",
        logoUrl: "/themes/xi/logo.svg",
        bannerUrl: null,
        fontPreset: "mono",
      },
    });
  });

  it("drops duplicate organizer emails", () => {
    const result = parsed({
      organizerEmails: "a@jahnelgroup.com A@jahnelgroup.com",
    });
    expect(result.ok && result.value.organizerEmails).toEqual([
      "a@jahnelgroup.com",
    ]);
  });

  it.each<[Partial<WarWeekSettingsInput>, string]>([
    [{ storyTheme: " " }, "Story Theme must not be empty."],
    [
      { storyTheme: "x".repeat(121) },
      "Story Theme must be at most 120 characters.",
    ],
    [{ primaryColor: "green" }, "Primary color must be a hex color."],
    [{ backgroundColor: "#12345" }, "Background color must be a hex color."],
    [
      { slackChannelUrl: "http://slack.com/x" },
      "Slack URL must be an https URL.",
    ],
    [
      { logoUrl: "logo.svg" },
      "Logo URL must be a root-relative path or an https URL.",
    ],
    [{ startDate: "2026-02-30" }, "Start date must be a date."],
    [{ status: "paused" }, "Status must be one of upcoming, live, complete."],
    [{ fontPreset: "comic" }, "Font must be one of sans, serif, mono."],
    [{ organizerEmails: " " }, "Add at least one organizer email."],
    [
      { organizerEmails: "a@jahnelgroup.com, not-an-email" },
      'Organizer email "not-an-email" must be a valid email.',
    ],
    [
      { startDate: "2026-02-28", endDate: "2026-02-27" },
      "Start date must not be after the end date.",
    ],
  ])("refuses %o", (overrides, error) => {
    expect(parsed(overrides)).toEqual({ ok: false, error });
  });
});

describe("settingsGuardError", () => {
  const value = (overrides: Partial<WarWeekSettingsInput> = {}) => {
    const result = parsed(overrides);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  };
  const ctx = {
    actorEmail: "pmacfarlane@jahnelgroup.com",
    teamCount: 0,
    dayDates: ["2026-02-22", "2026-02-27"],
  };

  it("allows a save that keeps the Organizer, Teams and Days consistent", () => {
    expect(settingsGuardError(value(), ctx)).toBeNull();
    expect(settingsGuardError(value({ mode: "free-for-all" }), ctx)).toBeNull();
    expect(settingsGuardError(value({ status: "complete" }), ctx)).toBeNull();
  });

  it("refuses switching to free-for-all while Teams exist", () => {
    expect(
      settingsGuardError(value({ mode: "free-for-all" }), {
        ...ctx,
        teamCount: 4,
      }),
    ).toBe(
      "This War Week has 4 Teams. Delete them before switching to free-for-all.",
    );
  });

  it("allows staying in teams mode with Teams", () => {
    expect(settingsGuardError(value(), { ...ctx, teamCount: 4 })).toBeNull();
  });

  it("refuses dates that would leave a Day outside the War Week", () => {
    expect(settingsGuardError(value({ endDate: "2026-02-26" }), ctx)).toBe(
      "The Day on 2026-02-27 falls outside the new dates. Move or delete it first.",
    );
  });

  it("refuses an Organizer removing their own email", () => {
    expect(
      settingsGuardError(value({ organizerEmails: "jason@jahnelgroup.com" }), {
        ...ctx,
        actorEmail: "PMacfarlane@jahnelgroup.com",
      }),
    ).toBe("You can't remove your own email from the organizer emails.");
  });
});

describe("parseDayInput", () => {
  it("trims the Day Theme", () => {
    expect(
      parseDayInput({ date: "2026-02-23", dayTheme: " Red pill " }),
    ).toEqual({
      ok: true,
      value: { date: "2026-02-23", dayTheme: "Red pill" },
    });
  });

  it.each([
    [{ date: "", dayTheme: "x" }, "Date must be a date."],
    [{ date: "2026-02-23", dayTheme: "" }, "Day Theme must not be empty."],
    [
      { date: "2026-02-23", dayTheme: "x".repeat(121) },
      "Day Theme must be at most 120 characters.",
    ],
  ])("refuses %o", (day, error) => {
    expect(parseDayInput(day)).toEqual({ ok: false, error });
  });
});

describe("dayGuardError", () => {
  const ctx = {
    startDate: "2026-02-22",
    endDate: "2026-02-27",
    otherDayDates: ["2026-02-22"],
  };

  it("allows a free date within the War Week", () => {
    expect(
      dayGuardError({ date: "2026-02-27", dayTheme: "x" }, ctx),
    ).toBeNull();
  });

  it("refuses a date outside the War Week", () => {
    expect(dayGuardError({ date: "2026-02-28", dayTheme: "x" }, ctx)).toBe(
      "A Day must fall within the War Week (2026-02-22 to 2026-02-27).",
    );
  });

  it("refuses a second Day on the same date", () => {
    expect(dayGuardError({ date: "2026-02-22", dayTheme: "x" }, ctx)).toBe(
      "There's already a Day on 2026-02-22.",
    );
  });
});

describe("dayDeleteGuardError", () => {
  it("allows deleting a Day with no Schedule Items", () => {
    expect(dayDeleteGuardError(0)).toBeNull();
  });

  it("refuses deleting a Day that has Schedule Items", () => {
    expect(dayDeleteGuardError(1)).toBe(
      "This Day has 1 Schedule Item. Delete or move it first.",
    );
    expect(dayDeleteGuardError(3)).toBe(
      "This Day has 3 Schedule Items. Delete or move them first.",
    );
  });
});
