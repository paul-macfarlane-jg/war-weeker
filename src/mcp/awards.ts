import type { AwardView } from "@/queries/awards";

export type AwardsResult = {
  edition: string;
  awards: {
    name: string;
    description: string | null;
    team: string | null;
    participants: string[];
  }[];
};

/**
 * Serializes a War Week's Awards into the `get_awards` MCP tool payload:
 * recipients by name, the same shape `get_history` uses.
 */
export function toAwardsResult(
  edition: string,
  awards: AwardView[],
): AwardsResult {
  return {
    edition,
    awards: awards.map((a) => ({
      name: a.name,
      description: a.description,
      team: a.team?.name ?? null,
      participants: a.participants.map((p) => p.displayName),
    })),
  };
}
