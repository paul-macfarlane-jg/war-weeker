import { describe, expect, it } from "vitest";

import {
  durationLabel,
  formatTime12,
  parseTime,
  timeOptions,
} from "@/lib/time-options";

describe("parseTime", () => {
  it.each([
    ["7:30p", "19:30"],
    ["7:30 pm", "19:30"],
    ["7:30PM", "19:30"],
    ["730pm", "19:30"],
    ["19:30", "19:30"],
    ["7p", "19:00"],
    ["12am", "00:00"],
    ["12pm", "12:00"],
    ["7:32p", "19:32"],
    ["9:15 a.m.", "09:15"],
  ])("reads %j as %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each([
    ["7", "07:00"],
    ["19", "19:00"],
    ["1930", "19:30"],
    ["0", "00:00"],
  ])("reads %j with no am/pm as 24-hour %j", (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(["", "   ", "abc", "25:00", "7:60", "13pm", "0pm", "24", "7:3"])(
    "rejects %j",
    (input) => {
      expect(parseTime(input)).toBeNull();
    },
  );
});

describe("formatTime12", () => {
  it("shows a 24-hour time on the 12-hour clock", () => {
    expect(formatTime12("19:30")).toBe("7:30 PM");
    expect(formatTime12("00:05")).toBe("12:05 AM");
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("09:00")).toBe("9:00 AM");
  });
});

describe("durationLabel", () => {
  it("labels the time between start and end", () => {
    expect(durationLabel("19:00", "19:45")).toBe("45m");
    expect(durationLabel("19:00", "20:00")).toBe("1h");
    expect(durationLabel("19:00", "20:30")).toBe("1h 30m");
  });

  it("is null when the end is not after the start", () => {
    expect(durationLabel("19:00", "19:00")).toBeNull();
    expect(durationLabel("19:00", "18:30")).toBeNull();
  });
});

describe("timeOptions", () => {
  it("offers every 5 minutes of the day", () => {
    const options = timeOptions();
    expect(options).toHaveLength(288);
    expect(options[0]).toEqual({ value: "00:00", label: "12:00 AM" });
    expect(options[1]).toEqual({ value: "00:05", label: "12:05 AM" });
    expect(options.at(-1)).toEqual({ value: "23:55", label: "11:55 PM" });
  });

  it("adds a duration to options after the start time", () => {
    const options = timeOptions("19:30");
    const find = (value: string) => options.find((o) => o.value === value);
    expect(find("20:30")?.label).toBe("8:30 PM · 1h");
    expect(find("19:45")?.label).toBe("7:45 PM · 15m");
    expect(find("21:00")?.label).toBe("9:00 PM · 1h 30m");
    expect(find("19:30")?.label).toBe("7:30 PM");
    expect(find("08:00")?.label).toBe("8:00 AM");
  });
});
