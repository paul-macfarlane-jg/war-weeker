import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OrganizerGuide } from "./organizer-guide";

describe("OrganizerGuide", () => {
  const html = renderToStaticMarkup(
    <OrganizerGuide edition="xi" teamLabel="Squad" leaderTitle="Captain" />,
  );
  const text = html.replace(/<[^>]+>/g, " ");

  const topics = [
    "First-time setup order",
    "Adding Organizers",
    "What a Participant email does",
    "Discretionary points",
    "Placement Points",
    "Hiding Standings and the Reveal",
    "Announcements and Slack",
    "The seed warning",
  ];

  it("has an h2 for every guide topic", () => {
    for (const topic of topics) {
      expect(html).toMatch(new RegExp(`<h2[^>]*>${topic}`));
    }
  });

  it("uses the War Week's Team Label", () => {
    expect(text).toContain("Squad");
  });

  it("links to the setup and standings admin pages", () => {
    expect(html).toContain('href="/admin/setup/war-week"');
    expect(html).toContain('href="/admin/standings"');
  });

  it("never uses banned vocabulary", () => {
    expect(text).not.toMatch(/\b(event|tournament|member|match|league)s?\b/i);
  });
});
