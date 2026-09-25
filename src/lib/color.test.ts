import { describe, expect, it } from "vitest";

import { normalizeHex } from "@/lib/color";

describe("normalizeHex", () => {
  it.each([
    ["#abc", "#aabbcc"],
    ["abc", "#aabbcc"],
    ["#AABBCC", "#aabbcc"],
    [" aabbcc ", "#aabbcc"],
    ["#1a2b3c", "#1a2b3c"],
    ["1A2B3C", "#1a2b3c"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeHex(input)).toBe(expected);
  });

  it.each([
    ["not-a-color"],
    ["#12345"],
    ["#1234567"],
    ["#gggggg"],
    [""],
    ["   "],
    ["#12g"],
  ])("rejects %s", (input) => {
    expect(normalizeHex(input)).toBeNull();
  });
});
