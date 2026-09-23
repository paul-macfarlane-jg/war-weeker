import { describe, expect, it } from "vitest";

import {
  type LedgerRow,
  buildCompetitionLedger,
  describeScoring,
  formatMaxPoints,
  groupCompetitions,
  isCompetitionId,
} from "@/lib/competitions";

function competition(
  name: string,
  competitionGroup: string | null = null,
): { name: string; competitionGroup: string | null } {
  return { name, competitionGroup };
}

describe("groupCompetitions", () => {
  it("returns no groups and no ungrouped Competitions for an empty list", () => {
    expect(groupCompetitions([])).toEqual({ groups: [], ungrouped: [] });
  });

  it("groups by Competition Group, ordering groups and Competitions by name", () => {
    const result = groupCompetitions([
      competition("Cypher", "Team Night Events"),
      competition("HQ Attendance", "Pre-War Week and General"),
      competition("Black Midnight"),
      competition("Deja Vu", "Team Night Events"),
      competition("AI Survey Completion", "Pre-War Week and General"),
      competition("Beyblades"),
    ]);

    expect(result.groups).toEqual([
      {
        name: "Pre-War Week and General",
        competitions: [
          competition("AI Survey Completion", "Pre-War Week and General"),
          competition("HQ Attendance", "Pre-War Week and General"),
        ],
      },
      {
        name: "Team Night Events",
        competitions: [
          competition("Cypher", "Team Night Events"),
          competition("Deja Vu", "Team Night Events"),
        ],
      },
    ]);
    expect(result.ungrouped).toEqual([
      competition("Beyblades"),
      competition("Black Midnight"),
    ]);
  });

  it("lists every Competition as ungrouped when none has a group", () => {
    const result = groupCompetitions([
      competition("Pool"),
      competition("Chess"),
    ]);
    expect(result.groups).toEqual([]);
    expect(result.ungrouped.map((c) => c.name)).toEqual(["Chess", "Pool"]);
  });
});

describe("describeScoring", () => {
  it.each([
    [{ scoring: "team", countsTowardTeam: false }, "Team"],
    [{ scoring: "individual", countsTowardTeam: false }, "Individual"],
    [
      { scoring: "individual", countsTowardTeam: true },
      "Individual · counts toward House",
    ],
  ] as const)("describes %o as %s", (c, expected) => {
    expect(describeScoring(c, "House")).toBe(expected);
  });
});

describe("formatMaxPoints", () => {
  it.each([
    [3, "Max 3 pts"],
    [1, "Max 1 pt"],
    [1.5, "Max 1.5 pts"],
    [null, "No max"],
  ])("formats %s as %s", (maxPoints, expected) => {
    expect(formatMaxPoints(maxPoints)).toBe(expected);
  });
});

describe("isCompetitionId", () => {
  it.each([
    ["3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b", true],
    ["not-a-uuid", false],
    ["", false],
    ["3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b; drop table", false],
  ])("%s is %s", (id, expected) => {
    expect(isCompetitionId(id)).toBe(expected);
  });
});

describe("buildCompetitionLedger", () => {
  const red = { name: "Red", color: "#ff3b3b" };
  const rows: LedgerRow[] = [
    {
      id: "e2",
      points: 1.5,
      note: null,
      enteredAt: new Date("2026-02-24T19:30:00-05:00"),
      team: null,
      participant: { displayName: "Neo", team: red },
    },
    {
      id: "e1",
      points: 3,
      note: "Won the final",
      enteredAt: new Date("2026-02-24T19:00:00-05:00"),
      team: red,
      participant: null,
    },
    {
      id: "e3",
      points: 1,
      note: null,
      enteredAt: new Date("2026-02-25T13:00:00-05:00"),
      team: null,
      participant: { displayName: "Trinity", team: null },
    },
  ];

  it("returns hidden and no entries while standings are hidden", () => {
    expect(buildCompetitionLedger({ standingsHidden: true, rows })).toEqual({
      hidden: true,
    });
  });

  it("lists entries in the order they were entered, naming each target", () => {
    expect(buildCompetitionLedger({ standingsHidden: false, rows })).toEqual({
      hidden: false,
      entries: [
        {
          id: "e1",
          target: { name: "Red", color: "#ff3b3b", team: null },
          points: 3,
          note: "Won the final",
        },
        {
          id: "e2",
          target: { name: "Neo", color: "#ff3b3b", team: "Red" },
          points: 1.5,
          note: null,
        },
        {
          id: "e3",
          target: { name: "Trinity", color: null, team: null },
          points: 1,
          note: null,
        },
      ],
    });
  });

  it("returns no entries for a Competition nobody has scored yet", () => {
    expect(
      buildCompetitionLedger({ standingsHidden: false, rows: [] }),
    ).toEqual({ hidden: false, entries: [] });
  });
});
