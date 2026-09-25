const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Parses a hex color typed into `ColorField`. Accepts an optional leading
 * `#`, 3- or 6-digit hex digits, and surrounding whitespace; always returns
 * a lowercase `#rrggbb` string (3-digit shorthand is expanded), or `null`
 * when the input isn't a hex color.
 */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  const parts = HEX_PATTERN.exec(trimmed);
  if (!parts) return null;

  const hex = parts[1].toLowerCase();
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : hex;

  return `#${expanded}`;
}
