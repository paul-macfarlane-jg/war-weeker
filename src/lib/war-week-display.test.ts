import { describe, expect, it } from "vitest";

import { formatDateRange } from "@/lib/war-week-display";

describe("formatDateRange", () => {
  it("shows the year once, on the end date", () => {
    expect(formatDateRange("2026-02-22", "2026-02-27")).toBe(
      "Feb 22 – Feb 27, 2026",
    );
  });
});
