import { describe, expect, it } from "vitest";

import {
  formatDateLabel,
  formatDateValue,
  parseDateValue,
} from "@/lib/date-value";

describe("parseDateValue", () => {
  it("reads a YYYY-MM-DD date as that local calendar date", () => {
    const date = parseDateValue("2026-02-22");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(1);
    expect(date?.getDate()).toBe(22);
  });

  it("round-trips through formatDateValue", () => {
    expect(formatDateValue(parseDateValue("2026-02-22")!)).toBe("2026-02-22");
  });

  it("refuses a date that doesn't exist", () => {
    expect(parseDateValue("2026-02-30")).toBeUndefined();
  });

  it.each(["", "2026-2-22", "02/22/2026", "2026-02-22T10:00", "soon"])(
    "refuses %j",
    (value) => {
      expect(parseDateValue(value)).toBeUndefined();
    },
  );
});

describe("formatDateLabel", () => {
  it("shows the weekday, month, day, and year", () => {
    expect(formatDateLabel(new Date(2026, 8, 21))).toBe("Mon, Sep 21, 2026");
  });
});
