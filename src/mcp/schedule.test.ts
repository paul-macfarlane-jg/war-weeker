import { describe, expect, it } from "vitest";

import type { ScheduleDay } from "@/lib/schedule";
import { toScheduleResult } from "@/mcp/schedule";

const days: ScheduleDay[] = [
  {
    id: "d1",
    date: "2026-02-23",
    dayTheme: "Tournament Day",
    items: [
      {
        id: "i1",
        startTime: "18:00:00",
        endTime: "22:00:00",
        title: "Tournament Night",
        host: "Jesse",
        location: "JGHQ",
        virtualLink: "https://meet.example.com/t",
        description: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Major " },
                { type: "text", text: "team", marks: [{ type: "bold" }] },
                { type: "text", text: " points." },
              ],
            },
            {
              type: "bulletList",
              content: [
                {
                  type: "listItem",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Pool" }],
                    },
                  ],
                },
              ],
            },
            { type: "image", attrs: { src: "https://x.test/a.png", alt: "" } },
          ],
        },
        category: "competition",
        competition: { id: "c1", name: "Tournament" },
      },
    ],
  },
  {
    id: "d2",
    date: "2026-02-24",
    dayTheme: "Red vs. Blue",
    items: [
      {
        id: "i2",
        startTime: "08:30:00",
        endTime: null,
        title: "Breakfast",
        host: null,
        location: null,
        virtualLink: null,
        description: null,
        category: "meal",
        competition: null,
      },
    ],
  },
];

describe("toScheduleResult", () => {
  it("returns the full schedule in ET when no date is given", () => {
    expect(toScheduleResult("xi", days)).toEqual({
      edition: "xi",
      timeZone: "America/New_York",
      date: null,
      days: [
        {
          date: "2026-02-23",
          dayTheme: "Tournament Day",
          items: [
            {
              startTime: "18:00",
              endTime: "22:00",
              title: "Tournament Night",
              host: "Jesse",
              location: "JGHQ",
              virtualLink: "https://meet.example.com/t",
              category: "competition",
              competition: "Tournament",
              description: "Major team points.\n- Pool",
            },
          ],
        },
        {
          date: "2026-02-24",
          dayTheme: "Red vs. Blue",
          items: [
            {
              startTime: "08:30",
              endTime: null,
              title: "Breakfast",
              host: null,
              location: null,
              virtualLink: null,
              category: "meal",
              competition: null,
              description: null,
            },
          ],
        },
      ],
    });
  });

  it("returns only the given day", () => {
    const result = toScheduleResult("xi", days, "2026-02-24");

    expect(result.date).toBe("2026-02-24");
    expect(result.days.map((d) => d.date)).toEqual(["2026-02-24"]);
  });

  it("returns no days for a date outside the War Week", () => {
    expect(toScheduleResult("xi", days, "2026-03-01").days).toEqual([]);
  });
});
