import type { CSSProperties } from "react";

import type { WarWeek } from "@/db/schema";

const FONT_PRESET_VAR: Record<WarWeek["fontPreset"], string> = {
  sans: "var(--font-preset-sans)",
  serif: "var(--font-preset-serif)",
  mono: "var(--font-preset-mono)",
};

/**
 * Maps a War Week's Appearance Theme onto the shadcn CSS custom properties
 * so the themed wrapper can be styled purely from `style`. Pure function:
 * no DOM, no I/O.
 */
export function warWeekThemeStyle(warWeek: WarWeek): CSSProperties {
  return {
    "--primary": warWeek.primaryColor,
    "--primary-foreground": warWeek.primaryForegroundColor,
    "--accent": warWeek.accentColor,
    "--accent-foreground": warWeek.primaryForegroundColor,
    "--background": warWeek.backgroundColor,
    "--foreground": warWeek.foregroundColor,
    "--card": warWeek.backgroundColor,
    "--card-foreground": warWeek.foregroundColor,
    "--border": warWeek.accentColor,
    "--ring": warWeek.primaryColor,
    "--font-sans": FONT_PRESET_VAR[warWeek.fontPreset],
    "--ww-primary": warWeek.primaryColor,
  } as CSSProperties;
}
