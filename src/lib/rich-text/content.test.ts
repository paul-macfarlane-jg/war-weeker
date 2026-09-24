import { describe, expect, it } from "vitest";

import { contentInputSchema, isHttpUrl } from "@/lib/rich-text/content";

describe("contentInputSchema", () => {
  it("drops an unrecognized block (iframe) and keeps the paragraph", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "iframe", attrs: { src: "https://evil.example.com" } },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    };

    expect(contentInputSchema.parse(doc)).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
      ],
    });
  });

  it("fails when the input is not a document", () => {
    expect(() => contentInputSchema.parse({ nope: true })).toThrow();
  });
});

describe("isHttpUrl", () => {
  it("accepts absolute http(s) URLs and rejects everything else", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("not-a-url")).toBe(false);
  });
});
