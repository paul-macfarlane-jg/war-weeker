import { describe, expect, it } from "vitest";

import type { Standings } from "@/lib/standings";
import { toLeaderboardResult } from "@/mcp/leaderboard";

const standings: Standings = {
  main: "team",
  team: [
    { id: "t1", name: "Blue", color: "#00f", total: 12.5, rank: 1 },
    { id: "t2", name: "Red", color: "#f00", total: 11, rank: 2 },
  ],
  individual: [
    {
      id: "p1",
      name: "Neo",
      team: { name: "Blue", color: "#00f" },
      total: 5,
      rank: 1,
    },
  ],
};

describe("toLeaderboardResult", () => {
  it("always returns Standings: there is no hidden result", () => {
    for (const kind of ["team", "individual"] as const) {
      const result = toLeaderboardResult(standings, kind, "House");

      expect(result).not.toHaveProperty("hidden");
      expect(result).not.toHaveProperty("message");
      expect(result.standings.length).toBeGreaterThan(0);
    }
  });

  it("returns team standings under the Team Label", () => {
    expect(toLeaderboardResult(standings, "team", "House")).toEqual({
      kind: "team",
      isMainLeaderboard: true,
      teamLabel: "House",
      standings: [
        { rank: 1, name: "Blue", color: "#00f", total: 12.5 },
        { rank: 2, name: "Red", color: "#f00", total: 11 },
      ],
    });
  });

  it("returns individual standings with each Participant's Team name", () => {
    expect(toLeaderboardResult(standings, "individual", "House")).toEqual({
      kind: "individual",
      isMainLeaderboard: false,
      teamLabel: "House",
      standings: [{ rank: 1, name: "Neo", team: "Blue", total: 5 }],
    });
  });
});
