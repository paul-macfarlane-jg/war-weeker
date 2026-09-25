import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { Standings } from "@/lib/standings";

import { Finale } from "./finale";

const standings: Standings = {
  main: "team",
  team: [
    { id: "t1", name: "Blue", color: "#00f", total: 12.5, rank: 1 },
    { id: "t2", name: "Red", color: "#f00", total: 11, rank: 2 },
  ],
  individual: [],
};

describe("Finale", () => {
  const html = renderToStaticMarkup(
    <Finale
      standings={standings}
      edition="xi"
      storyTheme="The Matrix"
      teamLabel="Team"
      primaryColor="#00ff41"
    />,
  );
  const text = html.replace(/<[^>]+>/g, " ");

  it("opens on a Start button, ready to play", () => {
    expect(html).toMatch(/<button[^>]*>[^<]*Start/);
    expect(html).toContain('data-finale="ready"');
    expect(text).toContain("War Week XI");
    expect(text).toContain("Team standings");
  });

  it("shows no Standings rows before Start, so nothing is spoiled", () => {
    expect(text).not.toContain("Blue");
    expect(text).not.toContain("Red");
    expect(text).not.toContain("12.5");
  });
});
