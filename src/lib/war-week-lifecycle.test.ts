import { describe, expect, it } from "vitest";

import type { Standings } from "@/lib/standings";
import {
  defaultWinner,
  nextEditionDefaults,
  parseClosingInput,
  parseNextWarWeekInput,
  toRoman,
  transitionError,
} from "@/lib/war-week-lifecycle";

type Status = "upcoming" | "live" | "complete";

describe("transitionError", () => {
  // Every from/to pair with no other War Week live.
  it.each<[Status, Status, string | null]>([
    ["upcoming", "live", null],
    ["live", "complete", null],
    ["complete", "live", null],
    ["upcoming", "upcoming", "This War Week is already upcoming."],
    ["live", "live", "This War Week is already live."],
    ["complete", "complete", "This War Week is already complete."],
    ["upcoming", "complete", "Start this War Week before ending it."],
    ["live", "upcoming", "A War Week can't go back to upcoming."],
    ["complete", "upcoming", "A War Week can't go back to upcoming."],
  ])("%s → %s with nothing else live: %j", (from, to, expected) => {
    expect(transitionError(from, to, { liveEdition: null })).toBe(expected);
  });

  it("refuses a second live War Week, naming the one to end", () => {
    expect(transitionError("upcoming", "live", { liveEdition: "xi" })).toBe(
      "End XI first.",
    );
    expect(transitionError("complete", "live", { liveEdition: "xii" })).toBe(
      "End XII first.",
    );
  });

  it("lets a War Week end while another is live", () => {
    expect(
      transitionError("live", "complete", { liveEdition: "xii" }),
    ).toBeNull();
  });
});

describe("toRoman", () => {
  it.each([
    [1, "i"],
    [4, "iv"],
    [9, "ix"],
    [11, "xi"],
    [12, "xii"],
    [14, "xiv"],
    [40, "xl"],
    [99, "xcix"],
  ])("%i is %s", (n, roman) => {
    expect(toRoman(n)).toBe(roman);
  });
});

describe("nextEditionDefaults", () => {
  it("follows the highest edition number and year", () => {
    expect(
      nextEditionDefaults([
        { editionNumber: 10, year: 2025 },
        { editionNumber: 11, year: 2026 },
        { editionNumber: 1, year: 2016 },
      ]),
    ).toEqual({ edition: "xii", editionNumber: 12, year: 2027 });
  });

  it("starts at I in the given year when there is no War Week", () => {
    expect(nextEditionDefaults([], 2030)).toEqual({
      edition: "i",
      editionNumber: 1,
      year: 2030,
    });
  });
});

const team = (name: string, rank: number) => ({
  id: name,
  name,
  color: "#000",
  total: 10,
  rank,
});
const person = (name: string, rank: number) => ({
  id: name,
  name,
  team: null,
  total: 10,
  rank,
});

describe("defaultWinner", () => {
  it("is first place in Team Standings in teams mode", () => {
    const standings: Standings = {
      main: "team",
      team: [team("Red", 1), team("Blue", 2)],
      individual: [person("Alice", 1)],
    };
    expect(defaultWinner(standings)).toBe("Red");
  });

  it("joins tied first places with ' & '", () => {
    const standings: Standings = {
      main: "team",
      team: [team("Blue", 1), team("Red", 1), team("Green", 3)],
      individual: [],
    };
    expect(defaultWinner(standings)).toBe("Blue & Red");
  });

  it("is first place in individual Standings in free-for-all", () => {
    const standings: Standings = {
      main: "individual",
      team: [],
      individual: [person("Alice", 1), person("Bob", 2)],
    };
    expect(defaultWinner(standings)).toBe("Alice");
  });

  it("is blank with no Standings", () => {
    expect(defaultWinner({ main: "team", team: [], individual: [] })).toBe("");
  });
});

describe("parseClosingInput", () => {
  it("trims the Winner and keeps one highlight per non-blank line", () => {
    expect(
      parseClosingInput({ winner: " Red ", highlights: "a\n\n b \n" }),
    ).toEqual({ ok: true, value: { winner: "Red", highlights: ["a", "b"] } });
  });

  it("allows no Winner", () => {
    expect(parseClosingInput({ winner: "  ", highlights: "" })).toEqual({
      ok: true,
      value: { winner: null, highlights: [] },
    });
  });

  it("refuses an over-long Winner or highlight", () => {
    expect(
      parseClosingInput({ winner: "x".repeat(201), highlights: "" }),
    ).toEqual({ ok: false, error: "Winner must be at most 200 characters." });
    expect(
      parseClosingInput({ winner: "Red", highlights: "y".repeat(501) }),
    ).toEqual({
      ok: false,
      error: "Highlights must be at most 500 characters.",
    });
  });
});

describe("parseNextWarWeekInput", () => {
  const input = {
    edition: " XII ",
    editionNumber: "12",
    year: "2027",
    startDate: "2027-02-21",
    endDate: "2027-02-26",
    storyTheme: " Dune ",
  };

  it("lowercases the edition, reads numbers and defaults the copy options", () => {
    expect(parseNextWarWeekInput(input)).toEqual({
      ok: true,
      value: {
        edition: "xii",
        editionNumber: 12,
        year: 2027,
        startDate: "2027-02-21",
        endDate: "2027-02-26",
        storyTheme: "Dune",
        copyOrganizers: true,
        copySettings: true,
        copyCompetitions: false,
        copyFaq: false,
      },
    });
  });

  it.each([
    [{ edition: "12" }, "Edition must be a Roman numeral like XII."],
    [{ editionNumber: "0" }, "Edition number must be at least 1."],
    [{ storyTheme: " " }, "Story Theme must not be empty."],
    [{ startDate: "2027-03-01" }, "Start date must not be after the end date."],
  ])("refuses %j", (overrides, error) => {
    expect(parseNextWarWeekInput({ ...input, ...overrides })).toEqual({
      ok: false,
      error,
    });
  });
});
