import type { LeaderboardKind, Standings } from "@/lib/standings";

export type LeaderboardResult = {
  kind: LeaderboardKind;
  isMainLeaderboard: boolean;
  teamLabel: string;
  standings: (
    | { rank: number; name: string; color: string; total: number }
    | { rank: number; name: string; team: string | null; total: number }
  )[];
};

/** Serializes Standings into the `get_leaderboard` MCP tool payload. */
export function toLeaderboardResult(
  standings: Standings,
  kind: LeaderboardKind,
  teamLabel: string,
): LeaderboardResult {
  return {
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
