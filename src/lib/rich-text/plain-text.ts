import {
  type Block,
  type TextElement,
  sanitizeContent,
} from "@/lib/rich-text/content";

function inlineText(elements: TextElement[] | undefined): string {
  return elements?.map((e) => e.text).join("") ?? "";
}

function blockLines(block: Block, indent = ""): string[] {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return [indent + inlineText(block.content)];
    case "bulletList":
    case "orderedList":
      return block.content.flatMap((item) =>
        (item.content ?? []).flatMap((child, index) =>
          blockLines(child, indent).map((line, lineIndex) =>
            index === 0 && lineIndex === 0 ? `- ${line}` : `  ${line}`,
          ),
        ),
      );
    case "image":
      return [];
  }
}

/**
 * Rich text as plain text for a Claude user; images are dropped. Shared by
 * every MCP serializer that returns a rich-text field as readable text
 * (Schedule Item descriptions, Announcement bodies).
 */
export function toPlainText(content: unknown): string | null {
  if (content == null) return null;
  const result = sanitizeContent(content);
  if (!result.ok) return null;
  const text = result.content.content
    .flatMap((block) => blockLines(block))
    .join("\n")
    .trim();
  return text || null;
}
