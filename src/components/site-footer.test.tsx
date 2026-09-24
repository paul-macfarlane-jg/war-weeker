import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { REPO_URL } from "@/lib/site";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("credits Jahnel Group for the current year and links to the repo in a new tab", () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain(`© ${new Date().getFullYear()} Jahnel Group`);
    expect(html).toContain(`href="${REPO_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(">GitHub<");
    expect(REPO_URL).toBe("https://github.com/paul-macfarlane/war-weeker");
  });
});
