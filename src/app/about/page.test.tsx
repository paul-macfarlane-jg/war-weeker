import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ABOUT_FEATURES,
  ABOUT_THEME,
  MAINTAINERS_GUIDE_URL,
} from "@/lib/about";

import AboutPage from "./page";

describe("AboutPage", () => {
  const html = renderToStaticMarkup(<AboutPage />);
  const text = html.replace(/<[^>]+>/g, " ");

  it("shows the Reveal as a looping muted video with a poster fallback", () => {
    expect(html).toContain('src="/about/reveal.mp4"');
    expect(html).toContain('poster="/about/reveal-poster.png"');
    expect(html).toMatch(/<video[^>]*\bautoplay\b/i);
    expect(html).toMatch(/<video[^>]*\bmuted\b/i);
    expect(html).toMatch(/<video[^>]*\bloop\b/i);
    expect(html).toMatch(/<video[^>]*\bplaysinline\b/i);
    expect(html).toContain('src="/about/reveal-poster.png"');
  });

  it("has the six feature cards, each with its still", () => {
    expect(ABOUT_FEATURES).toHaveLength(6);
    for (const feature of ABOUT_FEATURES) {
      expect(html).toContain(`data-feature="${feature.slug}"`);
      expect(html).toContain(`src="/about/${feature.slug}.png"`);
      expect(text).toContain(feature.title);
    }
  });

  it("ends on Open War Week XI and links the maintainer's guide", () => {
    expect(html).toContain('href="/xi"');
    expect(text).toContain("Open War Week XI");
    expect(html).toContain(`href="${MAINTAINERS_GUIDE_URL}"`);
  });

  it("tells Paul's story and mentions the one-sentence features", () => {
    expect(text).toContain("Why I built this");
    expect(text).toContain("2016");
    expect(text).toContain("Competiscore");
    expect(text).toMatch(/home screen/i);
    expect(text).toMatch(/Appearance Theme/);
  });

  it("mentions no build tooling and no banned terms", () => {
    expect(text).not.toMatch(/claude code/i);
    expect(text).not.toMatch(/atlas/i);
    expect(text).not.toMatch(/\bagents?\b/i);
    expect(text).not.toMatch(/\b(event|tournament|member|match|league)s?\b/i);
  });

  it("wears War Week XI's seeded Appearance Theme", () => {
    const seed = JSON.parse(
      readFileSync(new URL("../../../seeds/xi.json", import.meta.url), "utf8"),
    );
    expect(ABOUT_THEME).toEqual({
      primaryColor: seed.primary,
      primaryForegroundColor: seed.primaryForeground,
      accentColor: seed.accent,
      backgroundColor: seed.background,
      foregroundColor: seed.foreground,
      fontPreset: seed.fontPreset,
    });
  });

  it("never reads the database or the session", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/@\/(queries|db|auth)/);
    expect(source).not.toContain("force-dynamic");
  });
});
