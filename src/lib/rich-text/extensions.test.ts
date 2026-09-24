import { getSchema } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { editorExtensions } from "./extensions";

describe("editorExtensions", () => {
  const schema = getSchema(editorExtensions);

  it("produces only the closed content set's nodes", () => {
    expect(Object.keys(schema.nodes).sort()).toEqual(
      [
        "bulletList",
        "doc",
        "heading",
        "image",
        "listItem",
        "orderedList",
        "paragraph",
        "text",
        "video",
      ].sort(),
    );
  });

  it("produces only bold, italic and link marks", () => {
    expect(Object.keys(schema.marks).sort()).toEqual([
      "bold",
      "italic",
      "link",
    ]);
  });

  it("keeps images as blocks with alt text", () => {
    const image = schema.nodes.image;
    expect(image.isBlock).toBe(true);
    expect(Object.keys(image.spec.attrs ?? {})).toContain("alt");
  });

  it("keeps videos as atomic blocks holding only a src", () => {
    const video = schema.nodes.video;
    expect(video.isBlock).toBe(true);
    expect(video.isAtom).toBe(true);
    expect(Object.keys(video.spec.attrs ?? {})).toEqual(["src"]);
  });
});
