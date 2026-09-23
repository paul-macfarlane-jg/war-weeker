import type { CSSProperties } from "react";
import { describe, expect, it } from "vitest";

import type { WarWeek } from "@/db/schema";
import { warWeekThemeStyle } from "@/lib/theme";

const fixture: WarWeek = {
  id: "11111111-1111-1111-1111-111111111111",
  edition: "xi",
  editionNumber: 11,
  year: 2026,
  startDate: "2026-02-22",
  endDate: "2026-02-27",
  storyTheme: "The Matrix",
  status: "live",
  mode: "teams",
  teamLabel: "Team",
  leaderTitle: "Captain",
  slackChannelUrl: "https://jahnelgroup.slack.com/archives/war-week-xi",
  standingsHidden: true,
  primaryColor: "#00ff41",
  primaryForegroundColor: "#000000",
  accentColor: "#008f11",
  backgroundColor: "#000000",
  foregroundColor: "#d1ffd6",
  logoUrl: "/themes/xi/logo.svg",
  bannerUrl: "/themes/xi/banner.svg",
  fontPreset: "mono",
  wikiUrl: null,
  organizerEmails: ["pmacfarlane@jahnelgroup.com"],
  winner: null,
  highlights: [],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("warWeekThemeStyle", () => {
  it("maps a War Week's Appearance Theme onto shadcn CSS custom properties", () => {
    expect(warWeekThemeStyle(fixture)).toEqual({
      "--primary": "#00ff41",
      "--primary-foreground": "#000000",
      "--accent": "#008f11",
      "--accent-foreground": "#000000",
      "--background": "#000000",
      "--foreground": "#d1ffd6",
      "--card": "#000000",
      "--card-foreground": "#d1ffd6",
      "--border": "#008f11",
      "--ring": "#00ff41",
      "--font-sans": "var(--font-preset-mono)",
      "--ww-primary": "#00ff41",
    });
  });

  it("resolves each font preset to its own CSS variable", () => {
    const sansStyle = warWeekThemeStyle({
      ...fixture,
      fontPreset: "sans",
    }) as CSSProperties & Record<string, string>;
    const serifStyle = warWeekThemeStyle({
      ...fixture,
      fontPreset: "serif",
    }) as CSSProperties & Record<string, string>;

    expect(sansStyle["--font-sans"]).toBe("var(--font-preset-sans)");
    expect(serifStyle["--font-sans"]).toBe("var(--font-preset-serif)");
  });
});
