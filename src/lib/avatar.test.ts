import { describe, expect, it } from "vitest";

import { avatarColors, initials } from "@/lib/avatar";

describe("initials", () => {
  it("takes the first letters of the first and last words", () => {
    expect(initials("Paul Macfarlane")).toBe("PM");
  });

  it("gives one letter for one word", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("uses only the first and last of many words", () => {
    expect(initials("Sir Paul of the Backend")).toBe("SB");
  });

  it("ignores extra whitespace", () => {
    expect(initials("  Dom   Favata \t")).toBe("DF");
  });

  it("uppercases lowercase input", () => {
    expect(initials("lucas fernandes")).toBe("LF");
  });

  it("is empty for a blank name", () => {
    expect(initials("   ")).toBe("");
  });
});

describe("avatarColors", () => {
  it("fills with the Team color and puts black text on a light fill", () => {
    expect(
      avatarColors({ teamColor: "#ffd700", primaryColor: "#123456" }),
    ).toEqual({ fill: "#ffd700", text: "#000000" });
  });

  it("puts white text on a dark fill", () => {
    expect(
      avatarColors({ teamColor: "#1a237e", primaryColor: "#ffffff" }),
    ).toEqual({ fill: "#1a237e", text: "#ffffff" });
  });

  it("falls back to the Appearance Theme primary color with no Team", () => {
    expect(avatarColors({ teamColor: null, primaryColor: "#00ff41" })).toEqual({
      fill: "#00ff41",
      text: "#000000",
    });
  });
});
