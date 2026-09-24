import { describe, expect, it } from "vitest";

import { toPlainText } from "@/lib/rich-text/plain-text";

describe("toPlainText", () => {
  it("returns null for null or non-document input", () => {
    expect(toPlainText(null)).toBeNull();
    expect(toPlainText({ nope: true })).toBeNull();
  });

  it("joins paragraphs, headings and list items, dropping images", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Heads up" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bring snacks." }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Chips" }],
                },
              ],
            },
          ],
        },
        { type: "image", attrs: { src: "https://x.test/a.png", alt: "" } },
      ],
    };

    expect(toPlainText(content)).toBe("Heads up\nBring snacks.\n- Chips");
  });

  it("returns null when there is no renderable text", () => {
    expect(toPlainText({ type: "doc", content: [] })).toBeNull();
  });
});
