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
});
