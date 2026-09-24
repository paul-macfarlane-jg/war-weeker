import { contrastRatio } from "@/lib/theme";

const WHITE = "#ffffff";
const BLACK = "#000000";

/**
 * An Avatar's initials: the first letter of the first and last words of a
 * display name, uppercased. One word gives one letter. No special cases
 * ("Sir Paul of the Backend" → SB).
 */
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0];
  const last = words.length > 1 ? words[words.length - 1] : "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

/**
 * An Avatar's fill and text colors. The fill is the Participant's Team
 * color, or the Appearance Theme's primary color with no Team; the text is
 * white or black, whichever contrasts more with the fill.
 */
export function avatarColors({
  teamColor,
  primaryColor,
}: {
  teamColor: string | null;
  primaryColor: string;
}): { fill: string; text: string } {
  const fill = teamColor ?? primaryColor;
  const onWhite = contrastRatio(WHITE, fill) ?? 0;
  const onBlack = contrastRatio(BLACK, fill) ?? 0;
  return { fill, text: onBlack > onWhite ? BLACK : WHITE };
}
