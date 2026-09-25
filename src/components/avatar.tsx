import { AvatarFallback, Avatar as AvatarRoot } from "@/components/ui/avatar";
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
    <AvatarRoot aria-hidden className="size-8">
      <AvatarFallback
        className="text-xs font-semibold"
        style={{ backgroundColor: fill, color: text }}
      >
        {initials(name)}
      </AvatarFallback>
    </AvatarRoot>
  );
}
