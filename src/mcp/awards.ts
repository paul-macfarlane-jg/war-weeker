import type { ArchiveAward } from "@/lib/archive";
import { type AwardView, namedAward } from "@/lib/awards";

export type AwardsResult = { edition: string; awards: ArchiveAward[] };

/**
 * Serializes a War Week's Awards into the `get_awards` MCP tool payload:
 * recipients by name, the same shape `get_history` uses.
 */
export function toAwardsResult(
  edition: string,
  awards: AwardView[],
): AwardsResult {
  return { edition, awards: awards.map(namedAward) };
}
