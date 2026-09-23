import { describe, expect, it } from "vitest";

import { formatPoints } from "@/lib/points";

describe("formatPoints", () => {
  it.each([
    [0, "0"],
    [3, "3"],
    [1.5, "1.5"],
    [1.75, "1.75"],
    [1.8, "1.8"],
    [1234.5, "1,234.5"],
  ])("formats %d as %s", (points, expected) => {
    expect(formatPoints(points)).toBe(expected);
  });
});
