import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { warWeekSeedSchema } from "@/seed/schema";

function loadFixture() {
  const raw = readFileSync(
    path.resolve(__dirname, "../../seeds/xi.json"),
    "utf-8",
  );
  return JSON.parse(raw);
}

describe("warWeekSeedSchema", () => {
  it("parses the committed War Week XI seed", () => {
    const result = warWeekSeedSchema.safeParse(loadFixture());
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const seed = { ...loadFixture(), status: "archived" };
    const result = warWeekSeedSchema.safeParse(seed);
    expect(result.success).toBe(false);
  });

  it("rejects a story theme over the length limit", () => {
    const seed = { ...loadFixture(), storyTheme: "x".repeat(121) };
    const result = warWeekSeedSchema.safeParse(seed);
    expect(result.success).toBe(false);
  });

  it("rejects a day whose date falls outside the War Week's range", () => {
    const fixture = loadFixture();
    const seed = {
      ...fixture,
      days: [...fixture.days, { date: "2026-03-01", dayTheme: "Out of range" }],
    };
    const result = warWeekSeedSchema.safeParse(seed);
    expect(result.success).toBe(false);
  });

  it("rejects a non-hex appearance color", () => {
    const seed = { ...loadFixture(), primary: "not-a-color" };
    const result = warWeekSeedSchema.safeParse(seed);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate day dates", () => {
    const fixture = loadFixture();
    const seed = {
      ...fixture,
      days: [...fixture.days, fixture.days[0]],
    };
    const result = warWeekSeedSchema.safeParse(seed);
    expect(result.success).toBe(false);
  });
});
