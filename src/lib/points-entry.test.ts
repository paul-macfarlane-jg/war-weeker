import { describe, expect, it } from "vitest";

import {
  checkPointsEntryTarget,
  overMaxWarning,
  parsePointsEntryInput,
} from "@/lib/points-entry";

const competitionId = "8b0a4f0e-2a4e-4c1a-9a57-2f7c7b6f5d11";
const targetId = "0f5d6c3e-1b2a-4e8f-9c7d-6a5b4c3d2e1f";

describe("parsePointsEntryInput", () => {
  it("accepts decimal points, trims the note and drops an empty one", () => {
    const result = parsePointsEntryInput({
      competitionId,
      targetId,
      points: "2.5",
      note: "   ",
    });
    expect(result).toEqual({
      ok: true,
      value: { competitionId, targetId, points: 2.5, note: null },
    });

    const withNote = parsePointsEntryInput({
      competitionId,
      targetId,
      points: "-1",
      note: "  penalty ",
    });
    expect(withNote).toMatchObject({ ok: true, value: { points: -1 } });
    expect(withNote.ok && withNote.value.note).toBe("penalty");
  });

  it("rejects missing or non-numeric points", () => {
    for (const points of ["", "abc", "1e400"]) {
      const result = parsePointsEntryInput({ competitionId, targetId, points });
      expect(result.ok, points).toBe(false);
    }
  });

  it("rejects more than two decimal places and values the column can't hold", () => {
    expect(
      parsePointsEntryInput({ competitionId, targetId, points: "1.234" }).ok,
    ).toBe(false);
    expect(
      parsePointsEntryInput({ competitionId, targetId, points: "1000000" }).ok,
    ).toBe(false);
    expect(
      parsePointsEntryInput({ competitionId, targetId, points: "999999.99" })
        .ok,
    ).toBe(true);
  });

  it("requires a Competition and a target", () => {
    const result = parsePointsEntryInput({
      competitionId: "",
      targetId: "not-a-uuid",
      points: "1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Competition/);
    }
  });

  it("rejects a note over 500 characters", () => {
    expect(
      parsePointsEntryInput({
        competitionId,
        targetId,
        points: "1",
        note: "x".repeat(501),
      }).ok,
    ).toBe(false);
  });
});

describe("checkPointsEntryTarget", () => {
  const roster = {
    teamIds: new Set(["team-red"]),
    participantIds: new Set(["p-neo"]),
  };

  it("targets a Team in a team Competition", () => {
    expect(
      checkPointsEntryTarget({ scoring: "team" }, "team-red", roster),
    ).toEqual({
      ok: true,
      target: { teamId: "team-red", participantId: null },
    });
  });

  it("targets a Participant in an individual Competition", () => {
    expect(
      checkPointsEntryTarget({ scoring: "individual" }, "p-neo", roster),
    ).toEqual({ ok: true, target: { teamId: null, participantId: "p-neo" } });
  });

  it("rejects a Participant in a team Competition and vice versa", () => {
    expect(
      checkPointsEntryTarget({ scoring: "team" }, "p-neo", roster),
    ).toEqual({
      ok: false,
      error: "This Competition is scored by Team; pick a Team.",
    });
    expect(
      checkPointsEntryTarget({ scoring: "individual" }, "team-red", roster),
    ).toEqual({
      ok: false,
      error: "This Competition is scored individually; pick a Participant.",
    });
  });

  it("rejects a target that isn't in this War Week", () => {
    expect(
      checkPointsEntryTarget({ scoring: "team" }, "team-elsewhere", roster).ok,
    ).toBe(false);
  });
});

describe("overMaxWarning", () => {
  it("warns only when points exceed a set max", () => {
    expect(overMaxWarning(10, null)).toBeNull();
    expect(overMaxWarning(10, 10)).toBeNull();
    expect(overMaxWarning(10.5, 10)).toBe(
      "10.5 is over this Competition's max of 10 points. It will still save.",
    );
  });

  it("treats a missing or unparseable amount as no warning", () => {
    expect(overMaxWarning(Number.NaN, 5)).toBeNull();
  });
});
