import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { warWeekSeedSchema } from "@/seed/schema";

const SEEDS_DIR = path.resolve(__dirname, "../../seeds");

function loadFixture() {
  return JSON.parse(readFileSync(path.join(SEEDS_DIR, "xi.json"), "utf-8"));
}

/** Parses a seed that must fail and returns its issues as "path: message". */
function rejectionOf(seed: unknown): string[] {
  const result = warWeekSeedSchema.safeParse(seed);
  expect(result.success).toBe(false);
  return (result.error?.issues ?? []).map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
}

describe("committed seed files", () => {
  const files = readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".json"));

  it("finds at least one seed file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s passes the seed schema", (file) => {
    const json = JSON.parse(readFileSync(path.join(SEEDS_DIR, file), "utf-8"));
    const result = warWeekSeedSchema.safeParse(json);
    expect(result.success ? [] : result.error.issues).toEqual([]);
  });
});

describe("warWeekSeedSchema", () => {
  it("covers every entity in the XI seed", () => {
    const seed = warWeekSeedSchema.parse(loadFixture());
    expect(seed.teams.length).toBeGreaterThan(0);
    expect(seed.participants.length).toBeGreaterThan(0);
    expect(seed.competitions.length).toBeGreaterThan(0);
    expect(seed.days.some((d) => d.scheduleItems.length > 0)).toBe(true);
    expect(seed.pointsEntries.length).toBeGreaterThan(0);
    expect(seed.awards.length).toBeGreaterThan(0);
    expect(seed.announcements.length).toBeGreaterThan(0);
    expect(seed.faqItems.length).toBeGreaterThan(0);
  });

  it("rejects an unknown status", () => {
    rejectionOf({ ...loadFixture(), status: "archived" });
  });

  it("rejects a story theme over the length limit", () => {
    rejectionOf({ ...loadFixture(), storyTheme: "x".repeat(121) });
  });

  it("rejects a day whose date falls outside the War Week's range", () => {
    const fixture = loadFixture();
    rejectionOf({
      ...fixture,
      days: [...fixture.days, { date: "2026-03-01", dayTheme: "Out of range" }],
    });
  });

  it("rejects a non-hex appearance color", () => {
    rejectionOf({ ...loadFixture(), primary: "not-a-color" });
  });

  it("rejects duplicate day dates", () => {
    const fixture = loadFixture();
    rejectionOf({ ...fixture, days: [...fixture.days, fixture.days[0]] });
  });

  describe("Points Entries", () => {
    function withEntry(entry: Record<string, unknown>) {
      const fixture = loadFixture();
      return {
        ...fixture,
        pointsEntries: [
          {
            key: "fixture-entry",
            enteredByEmail: "organizer@jahnelgroup.com",
            enteredAt: "2026-02-23T20:00:00-05:00",
            points: 5,
            ...entry,
          },
        ],
      };
    }

    it("rejects an entry with both a team and a participant", () => {
      expect(
        rejectionOf(
          withEntry({
            competition: "Tournament Night",
            team: "Red",
            participant: "Thomas Anderson",
          }),
        ),
      ).toContain(
        "pointsEntries.0.team: a Points Entry must target exactly one of team or participant",
      );
    });

    it("rejects an entry with neither a team nor a participant", () => {
      expect(
        rejectionOf(withEntry({ competition: "Tournament Night" })),
      ).toContain(
        "pointsEntries.0.team: a Points Entry must target exactly one of team or participant",
      );
    });

    it("rejects a participant target on a team Competition", () => {
      expect(
        rejectionOf(
          withEntry({
            competition: "Tournament Night",
            participant: "Thomas Anderson",
          }),
        ),
      ).toContain(
        'pointsEntries.0.participant: "Tournament Night" is a team Competition, so its Points Entries must target a team',
      );
    });

    it("rejects a team target on an individual Competition", () => {
      expect(
        rejectionOf(withEntry({ competition: "Speed Chess", team: "Red" })),
      ).toContain(
        'pointsEntries.0.team: "Speed Chess" is an individual Competition, so its Points Entries must target a participant',
      );
    });

    it("rejects an unknown Competition or target", () => {
      const issues = rejectionOf(
        withEntry({ competition: "Pod Racing", team: "Green" }),
      );
      expect(issues).toContain(
        'pointsEntries.0.competition: unknown Competition "Pod Racing"',
      );
      expect(issues).toContain('pointsEntries.0.team: unknown Team "Green"');
    });

    it("accepts fractional points", () => {
      const result = warWeekSeedSchema.safeParse(
        withEntry({
          competition: "Tournament Night",
          team: "Red",
          points: 1.5,
        }),
      );
      expect(result.success).toBe(true);
    });
  });

  it("rejects an unknown Schedule Item category", () => {
    const fixture = loadFixture();
    fixture.days[1].scheduleItems[0].category = "party";
    const issues = rejectionOf(fixture);
    expect(
      issues.some((i) => i.startsWith("days.1.scheduleItems.0.category:")),
    ).toBe(true);
  });

  it("rejects Counts Toward Team on a team Competition", () => {
    const fixture = loadFixture();
    fixture.competitions.push({
      name: "Beast Mode Workout",
      scoring: "team",
      countsTowardTeam: true,
    });
    const index = fixture.competitions.length - 1;
    expect(rejectionOf(fixture)).toContain(
      `competitions.${index}.countsTowardTeam: countsTowardTeam can only be set on an individual Competition`,
    );
  });

  it("rejects an Announcement video URL outside the allow-list", () => {
    const fixture = loadFixture();
    fixture.announcements[0].videoUrls = ["https://evil.example.com/watch?v=1"];
    expect(rejectionOf(fixture)).toContain(
      "announcements.0.videoUrls.0: must be a YouTube, Loom, Vimeo or Google Drive URL",
    );
  });

  it("accepts each allow-listed video host", () => {
    const fixture = loadFixture();
    fixture.announcements[0].videoUrls = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.loom.com/share/abc",
      "https://vimeo.com/123",
      "https://drive.google.com/file/d/abc/view",
    ];
    expect(warWeekSeedSchema.safeParse(fixture).success).toBe(true);
  });

  it("rejects duplicate Participant emails, ignoring case", () => {
    const fixture = loadFixture();
    fixture.participants[0].email = "neo@example.com";
    fixture.participants[1].email = "NEO@example.com";
    expect(rejectionOf(fixture)).toContain(
      'participants.1.email: duplicate Participant email "neo@example.com"',
    );
  });

  it("rejects a Participant on an unknown Team", () => {
    const fixture = loadFixture();
    fixture.participants[0].team = "Green";
    expect(rejectionOf(fixture)).toContain(
      'participants.0.team: unknown Team "Green"',
    );
  });

  it("rejects an Award with no recipients", () => {
    const fixture = loadFixture();
    fixture.awards[0].participants = [];
    expect(rejectionOf(fixture)).toContain(
      "awards.0.participants: an Award needs at least one recipient (a team or participants)",
    );
  });

  it("rejects Teams in a free-for-all War Week", () => {
    expect(rejectionOf({ ...loadFixture(), mode: "free-for-all" })).toContain(
      "teams: a free-for-all War Week has no Teams",
    );
  });

  it("sanitizes rich text on parse", () => {
    const fixture = loadFixture();
    fixture.faqItems[0].answer = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    };
    const seed = warWeekSeedSchema.parse(fixture);
    expect(seed.faqItems[0].answer).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "click" }] },
      ],
    });
  });
});
