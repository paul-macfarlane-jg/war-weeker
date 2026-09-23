import type { LeaderboardKind, Standings } from "@/lib/standings";

export const HIDDEN_MESSAGE =
  "Standings are hidden until closing ceremonies. Check back after the Reveal.";

export type LeaderboardResult =
  | { hidden: true; message: string }
  | {
      hidden: false;
      kind: LeaderboardKind;
      isMainLeaderboard: boolean;
      teamLabel: string;
      standings: (
        | { rank: number; name: string; color: string; total: number }
        | { rank: number; name: string; team: string | null; total: number }
      )[];
    };

/**
 * Serializes Standings into the `get_leaderboard` MCP tool payload. While
 * hidden it returns only the hidden message, so no numbers can leak.
 */
export function toLeaderboardResult(
  standings: Standings,
  kind: LeaderboardKind,
  teamLabel: string,
): LeaderboardResult {
  if (standings.hidden) return { hidden: true, message: HIDDEN_MESSAGE };

  return {
    hidden: false,
    kind,
    isMainLeaderboard: standings.main === kind,
    teamLabel,
    standings:
      kind === "team"
        ? standings.team.map(({ rank, name, color, total }) => ({
            rank,
            name,
            color,
            total,
          }))
        : standings.individual.map(({ rank, name, team, total }) => ({
            rank,
            name,
            team: team?.name ?? null,
            total,
          })),
  };
}
