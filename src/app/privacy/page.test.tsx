import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PrivacyPage from "./page";

describe("PrivacyPage", () => {
  const html = renderToStaticMarkup(<PrivacyPage />);
  const text = html.replace(/<[^>]+>/g, " ");

  it("shows when it was last updated", () => {
    expect(text).toContain("Last updated: September 24, 2026");
  });

  it("points corrections or removal to the Organizers or Jahnel Group", () => {
    expect(text).toContain("contact the War Week Organizers or Jahnel Group");
  });

  it("mentions the key data inventory", () => {
    expect(text).toMatch(/profile picture/i);
    expect(text).toMatch(/IP address/i);
    expect(text).toMatch(/Company Tag/i);
    expect(text).toMatch(/Vercel/i);
    expect(text).toMatch(/Neon/i);
  });

  it("never mentions Slack, analytics beyond saying there is none, or an email address", () => {
    expect(text).not.toMatch(/post(s|ed|ing)? to Slack/i);
    expect(text).toMatch(/no analytics/i);
    expect(text.match(/analytics/gi)).toHaveLength(1);
    expect(html).not.toContain("mailto:");
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
