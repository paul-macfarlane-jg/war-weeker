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

describe("video blocks", () => {
  function video(src: unknown) {
    return { type: "doc", content: [{ type: "video", attrs: { src } }] };
  }

  it("keeps a video whose URL is an embeddable allow-listed host", () => {
    const src = "https://www.youtube.com/watch?v=abc123";
    expect(contentInputSchema.parse(video(src))).toEqual(video(src));
  });

  it.each([
    "https://evil.example.com/watch?v=abc123",
    "javascript:alert(1)",
    "http://www.youtube.com/watch?v=abc123",
    "https://www.youtube.com/playlist?list=x",
    42,
  ])("drops a video with src %s", (src) => {
    expect(contentInputSchema.parse(video(src))).toEqual({
      type: "doc",
      content: [],
    });
  });

  it("drops attrs other than src", () => {
    const src = "https://vimeo.com/123456";
    expect(
      contentInputSchema.parse({
        type: "doc",
        content: [{ type: "video", attrs: { src, onload: "x" } }],
      }),
    ).toEqual(video(src));
  });
});
