import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TermsPage from "./page";

describe("TermsPage", () => {
  const html = renderToStaticMarkup(<TermsPage />);
  const text = html.replace(/<[^>]+>/g, " ");

  it("shows when it was last updated", () => {
    expect(text).toContain("Last updated: September 24, 2026");
  });

  it("directs questions to the Organizers or Jahnel Group", () => {
    expect(text).toContain("Contact the War Week Organizers or Jahnel Group");
  });

  it("states it's an internal Jahnel Group tool with no warranty", () => {
    expect(text).toMatch(/internal Jahnel Group tool/i);
    expect(text).toMatch(/@jahnelgroup\.com/);
    expect(text).toMatch(/no warranty/i);
  });

  it("never reads the database, auth, or session, and isn't force-dynamic", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/@\/(queries|db|auth)/);
    expect(source).not.toContain("force-dynamic");
  });

  it("mentions no banned terms", () => {
    expect(text).not.toMatch(/\b(event|tournament|member|match|league)s?\b/i);
  });
});
