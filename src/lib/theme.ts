import type { CSSProperties } from "react";

import type { WarWeek } from "@/db/schema";

const FONT_PRESET_VAR: Record<WarWeek["fontPreset"], string> = {
  sans: "var(--font-preset-sans)",
  serif: "var(--font-preset-serif)",
  mono: "var(--font-preset-mono)",
};

/** The Appearance Theme fields the themed wrapper is styled from. */
export type ThemeColors = Pick<
  WarWeek,
  | "primaryColor"
  | "primaryForegroundColor"
  | "accentColor"
  | "backgroundColor"
  | "foregroundColor"
  | "fontPreset"
>;

/**
 * Maps a War Week's Appearance Theme onto the shadcn CSS custom properties
 * so the themed wrapper can be styled purely from `style`. Pure function:
 * no DOM, no I/O.
 */
export function warWeekThemeStyle(warWeek: ThemeColors): CSSProperties {
  const bg = warWeek.backgroundColor;
  const fg = warWeek.foregroundColor;
  // Muted surfaces lean from the background toward the text, and muted text
  // leans back toward the background: symmetric, so light and dark themes
  // both keep hover, popover and input states readable.
  const mutedSurface = `color-mix(in oklch, ${bg}, ${fg} 12%)`;
  const mutedText = `color-mix(in oklch, ${fg}, ${bg} 35%)`;
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
    "--muted": mutedSurface,
    "--muted-foreground": mutedText,
    "--secondary": mutedSurface,
    "--secondary-foreground": mutedText,
    "--popover": bg,
    "--popover-foreground": fg,
    "--input": `color-mix(in oklch, ${bg}, ${fg} 20%)`,
    "--font-sans": FONT_PRESET_VAR[warWeek.fontPreset],
    "--ww-primary": warWeek.primaryColor,
  } as CSSProperties;
}

/** WCAG AA contrast for body text. */
export const MIN_TEXT_CONTRAST = 4.5;

/** A hex color's WCAG relative luminance, or null when it isn't a hex color. */
function luminance(hex: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits =
    match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast ratio of two hex colors (1–21), or null if either isn't one. */
export function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The text-on-color pairs the themed pages draw, each below WCAG AA, as
 * warnings for the setup form. Not a refusal: an Organizer may keep them.
 */
export function themeContrastWarnings(theme: ThemeColors): string[] {
  const pairs = [
    ["Text", theme.foregroundColor, "background", theme.backgroundColor],
    [
      "Primary text",
      theme.primaryForegroundColor,
      "primary",
      theme.primaryColor,
    ],
    ["Primary text", theme.primaryForegroundColor, "accent", theme.accentColor],
  ] as const;
  return pairs.flatMap(([text, fg, surface, bg]) => {
    const ratio = contrastRatio(fg, bg);
    return ratio != null && ratio < MIN_TEXT_CONTRAST
      ? [
          `${text} on ${surface} is ${ratio.toFixed(1)}:1, below ${MIN_TEXT_CONTRAST}:1 and may be hard to read.`,
        ]
      : [];
  });
}
