/**
 * Classes for a row that may hold a `YouTag`: it takes a ring and a
 * background in the Appearance Theme accent when the tag renders. Lives
 * here, not in the client component, so server components can use it.
 */
export const YOU_ROW_CLASS =
  "has-[[data-you]]:bg-accent/20 has-[[data-you]]:ring-accent has-[[data-you]]:rounded-md has-[[data-you]]:ring-2";

export type YouCandidate = { id: string; email?: string | null };

/** Who "you" are in a War Week, and how the app knows. */
export type You = { participantId: string; via: "email" | "pick" } | null;

const normalize = (email: string | null | undefined) =>
  email?.trim().toLowerCase() ?? "";

/**
 * Resolves the signed-in person to one of a War Week's Participants.
 * Account linking comes first: the session email matching a Participant
 * email, ignoring case. Otherwise the person's own "Which one is you?"
 * pick, kept only while that Participant is still in the War Week.
 * A read-time match only; nothing is written anywhere.
 */
export function resolveYou({
  sessionEmail,
  participants,
  storedId,
}: {
  sessionEmail: string | null | undefined;
  participants: YouCandidate[];
  storedId: string | null | undefined;
}): You {
  const email = normalize(sessionEmail);
  if (email) {
    const linked = participants.find((p) => normalize(p.email) === email);
    if (linked) return { participantId: linked.id, via: "email" };
  }
  if (storedId && participants.some((p) => p.id === storedId)) {
    return { participantId: storedId, via: "pick" };
  }
  return null;
}

/** The `localStorage` key holding a War Week's "Which one is you?" pick. */
export function youStorageKey(edition: string): string {
  return `ww:you:${edition}`;
}

/** A stored pick as read from `localStorage`: a non-blank id, or null. */
export function parseStoredYou(
  value: string | null | undefined,
): string | null {
  const id = value?.trim();
  return id ? id : null;
}
