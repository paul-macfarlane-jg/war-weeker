import { describe, expect, it } from "vitest";

import type { Standings } from "@/lib/standings";
import { HIDDEN_MESSAGE, toLeaderboardResult } from "@/mcp/leaderboard";

const visible: Standings = {
  hidden: false,
  main: "team",
  team: [
    { id: "t1", name: "Blue", color: "#00f", total: 12.5, rank: 1 },
    { id: "t2", name: "Red", color: "#f00", total: 11, rank: 2 },
  ],
  individual: [{ id: "p1", name: "Neo", teamId: "t1", total: 5, rank: 1 }],
};

describe("toLeaderboardResult", () => {
  it("returns the explicit hidden result, with no numbers, while hidden", () => {
    for (const kind of ["team", "individual"] as const) {
      const result = toLeaderboardResult({ hidden: true }, kind, "House");

      expect(result).toEqual({ hidden: true, message: HIDDEN_MESSAGE });
      expect(JSON.stringify(result)).not.toMatch(/\d/);
    }
    expect(HIDDEN_MESSAGE).toContain("hidden until closing ceremonies");
  });

  it("returns team standings under the Team Label", () => {
    expect(toLeaderboardResult(visible, "team", "House")).toEqual({
      hidden: false,
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
    expect(toLeaderboardResult(visible, "individual", "House")).toEqual({
      hidden: false,
      kind: "individual",
      isMainLeaderboard: false,
      teamLabel: "House",
      standings: [{ rank: 1, name: "Neo", team: "Blue", total: 5 }],
    });
  });
});
