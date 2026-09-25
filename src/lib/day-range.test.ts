import { describe, expect, it } from "vitest";

import { dayOutsideRangeError, nextRangeSelection } from "@/lib/day-range";

const days = ["2026-02-23", "2026-02-25"];

describe("nextRangeSelection", () => {
  it("holds the first tap as the start and commits nothing", () => {
    expect(nextRangeSelection(null, "2026-02-22", days)).toEqual({
      pending: { from: "2026-02-22" },
    });
  });

  it("commits the range on the second tap", () => {
    expect(
      nextRangeSelection({ from: "2026-02-22" }, "2026-02-27", days),
    ).toEqual({
      pending: null,
      commit: { start: "2026-02-22", end: "2026-02-27" },
    });
  });

  it("puts a second tap earlier than the first at the start", () => {
    expect(
      nextRangeSelection({ from: "2026-02-27" }, "2026-02-22", days),
    ).toEqual({
      pending: null,
      commit: { start: "2026-02-22", end: "2026-02-27" },
    });
  });

  it("commits a one-day range when the same date is tapped twice", () => {
    expect(
      nextRangeSelection({ from: "2026-03-02" }, "2026-03-02", []),
    ).toEqual({
      pending: null,
      commit: { start: "2026-03-02", end: "2026-03-02" },
    });
  });

  it("refuses a range that leaves a Day outside it and keeps it on screen", () => {
    expect(
      nextRangeSelection({ from: "2026-02-24" }, "2026-02-27", days),
    ).toEqual({
      pending: { from: "2026-02-24", to: "2026-02-27" },
      error:
        "The Day on 2026-02-23 falls outside the new dates. Move or delete it first.",
    });
  });

  it("starts over from the next tap after a refused range", () => {
    expect(
      nextRangeSelection(
        { from: "2026-02-24", to: "2026-02-27" },
        "2026-02-20",
        days,
      ),
    ).toEqual({ pending: { from: "2026-02-20" } });
  });
});

describe("dayOutsideRangeError", () => {
  it("names the earliest Day outside the dates", () => {
    expect(
      dayOutsideRangeError(
        ["2026-02-28", "2026-02-20"],
        "2026-02-22",
        "2026-02-26",
      ),
    ).toBe(
      "The Day on 2026-02-20 falls outside the new dates. Move or delete it first.",
    );
  });

  it("allows dates that keep every Day inside", () => {
    expect(dayOutsideRangeError(days, "2026-02-23", "2026-02-25")).toBeNull();
  });
});
