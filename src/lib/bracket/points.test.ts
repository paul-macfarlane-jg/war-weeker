import { describe, expect, it } from "vitest";

import { pointsFor } from "@/lib/bracket/points";

// 8 Entrants: 1st, 2nd, tied 3rd, tied 5th.
const placings = [
  { entrantId: "a", place: 1 },
  { entrantId: "b", place: 2 },
  { entrantId: "c", place: 3 },
  { entrantId: "d", place: 3 },
  { entrantId: "e", place: 5 },
  { entrantId: "f", place: 5 },
  { entrantId: "g", place: 5 },
  { entrantId: "h", place: 5 },
];

describe("pointsFor", () => {
  it("gives each tied place that place's Placement Points", () => {
    expect(pointsFor(placings, { placementPoints: [10, 6, 3] })).toEqual([
      { entrantId: "a", points: 10 },
      { entrantId: "b", points: 6 },
      { entrantId: "c", points: 3 },
      { entrantId: "d", points: 3 },
    ]);
  });

  it("covers places up to 5th", () => {
    expect(
      pointsFor(placings, { placementPoints: [5, 4, 3, 2, 1] }).map(
        (p) => p.points,
      ),
    ).toEqual([5, 4, 3, 3, 1, 1, 1, 1]);
  });

  it("awards nothing without Placement Points", () => {
    expect(pointsFor(placings, { placementPoints: null })).toEqual([]);
  });
});
