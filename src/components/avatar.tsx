import { avatarColors, initials } from "@/lib/avatar";

/**
 * A Participant's Avatar: their initials in their Team's color, or the
 * Appearance Theme's primary color with no Team. Decorative next to the
 * visible name, so screen readers skip it.
 */
export function Avatar({
  name,
  teamColor,
  primaryColor,
}: {
  name: string;
  teamColor: string | null;
  primaryColor: string;
}) {
  const { fill, text } = avatarColors({ teamColor, primaryColor });
  return (
    <span
      aria-hidden
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ backgroundColor: fill, color: text }}
    >
      {initials(name)}
    </span>
  );
}
