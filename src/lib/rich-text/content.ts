import { z } from "zod";

/**
 * Rich text (Announcement bodies, FAQ answers, Schedule Item descriptions),
 * stored in `jsonb` exactly as TipTap/ProseMirror emits it: a `doc` holding a
 * list of blocks. Copied from journeys.
 *
 * The allowed set is small and closed: paragraphs, headings, bullet and
 * ordered lists, images by URL, and bold/italic/link marks. `sanitizeContent`
 * runs on every write (the seed loader today, organizer actions later) and
 * again on render, so content that reached storage some other way still
 * cannot render a `javascript:` link or a `data:` image.
 */

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string; rel: "noopener noreferrer" } };

export type TextElement = { type: "text"; text: string; marks?: Mark[] };

export type Paragraph = { type: "paragraph"; content?: TextElement[] };

export type Heading = {
  type: "heading";
  attrs: { level: number };
  content?: TextElement[];
};

export type ListItem = {
  type: "listItem";
  content?: Array<Paragraph | BulletList | OrderedList>;
};

export type BulletList = { type: "bulletList"; content: ListItem[] };

export type OrderedList = {
  type: "orderedList";
  attrs?: { start: number };
  content: ListItem[];
};

/** `alt` is for assistive technology; `""` until someone writes one. */
export type ImageBlock = {
  type: "image";
  attrs: { src: string; alt: string };
};

export type Block = Paragraph | Heading | BulletList | OrderedList | ImageBlock;

export type Content = { type: "doc"; content: Block[] };

const markSchema: z.ZodType<Mark> = z.union([
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: z.string().min(1),
      // Optional on the way in; the sanitizer always sets it.
      rel: z.literal("noopener noreferrer").default("noopener noreferrer"),
    }),
  }),
]);

const textSchema: z.ZodType<TextElement> = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(markSchema).optional(),
});

const paragraphSchema: z.ZodType<Paragraph> = z.object({
  type: z.literal("paragraph"),
  content: z.array(textSchema).optional(),
});

const headingSchema: z.ZodType<Heading> = z.object({
  type: z.literal("heading"),
  attrs: z.object({ level: z.number().int().min(1).max(6) }),
  content: z.array(textSchema).optional(),
});

// Lists and list items refer to each other, so the inner schemas are reached
// lazily. TipTap omits `content` on an empty list item.
const listItemSchema: z.ZodType<ListItem> = z.object({
  type: z.literal("listItem"),
  content: z
    .array(
      z.lazy(() =>
        z.union([paragraphSchema, bulletListSchema, orderedListSchema]),
      ),
    )
    .optional(),
});

const bulletListSchema: z.ZodType<BulletList> = z.object({
  type: z.literal("bulletList"),
  content: z.array(z.lazy(() => listItemSchema)),
});

const orderedListSchema: z.ZodType<OrderedList> = z.object({
  type: z.literal("orderedList"),
  attrs: z.object({ start: z.number().int() }).optional(),
  content: z.array(z.lazy(() => listItemSchema)),
});

const imageSchema: z.ZodType<ImageBlock> = z.object({
  type: z.literal("image"),
  attrs: z.object({
    src: z.string().min(1),
    alt: z.string().default(""),
  }),
});

const blockSchema: z.ZodType<Block> = z.union([
  paragraphSchema,
  headingSchema,
  bulletListSchema,
  orderedListSchema,
  imageSchema,
]);

/** The shape of stored rich text. Pair with `sanitizeContent` on write. */
export const contentSchema: z.ZodType<Content> = z.object({
  type: z.literal("doc"),
  content: z.array(blockSchema),
});

export type SanitizeContentResult =
  { ok: true; content: Content } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns the URL when it is an absolute `http:` or `https:` URL, and null
 * otherwise. `javascript:`, `data:`, `mailto:`, relative paths, and
 * protocol-relative `//host` forms all return null.
 */
function absoluteHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/** The same absolute http(s) test the write-path sanitizer applies. */
export function isHttpUrl(value: string): boolean {
  return absoluteHttpUrl(value) !== null;
}

function sanitizeMarks(input: unknown): Mark[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const marks: Mark[] = [];
  for (const candidate of input) {
    if (!isRecord(candidate)) {
      continue;
    }
    if (candidate.type === "bold" || candidate.type === "italic") {
      marks.push({ type: candidate.type });
      continue;
    }
    if (candidate.type === "link") {
      const attrs = isRecord(candidate.attrs) ? candidate.attrs : {};
      const href = absoluteHttpUrl(attrs.href);
      // An unsafe link loses the mark; the text it wrapped stays.
      if (href !== null) {
        marks.push({
          type: "link",
          attrs: { href, rel: "noopener noreferrer" },
        });
      }
    }
  }
  return marks;
}

function sanitizeInline(input: unknown): TextElement[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const inline: TextElement[] = [];
  for (const candidate of input) {
    // Anything that is not a run of text is removed with its contents.
    if (!isRecord(candidate) || candidate.type !== "text") {
      continue;
    }
    if (typeof candidate.text !== "string" || candidate.text.length === 0) {
      continue;
    }
    const marks = sanitizeMarks(candidate.marks);
    inline.push(
      marks.length > 0
        ? { type: "text", text: candidate.text, marks }
        : { type: "text", text: candidate.text },
    );
  }
  return inline;
}

function headingLevel(attrs: unknown): number {
  const level = isRecord(attrs) ? attrs.level : undefined;
  const valid =
    typeof level === "number" &&
    Number.isInteger(level) &&
    level >= 1 &&
    level <= 6;
  return valid ? level : 1;
}

function sanitizeImage(input: Record<string, unknown>): ImageBlock | null {
  const attrs = isRecord(input.attrs) ? input.attrs : {};
  const src = absoluteHttpUrl(attrs.src);
  if (src === null) {
    return null;
  }
  const alt = typeof attrs.alt === "string" ? attrs.alt.trim() : "";
  return { type: "image", attrs: { src, alt } };
}

function sanitizeListItems(input: unknown): ListItem[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const items: ListItem[] = [];
  for (const candidate of input) {
    if (!isRecord(candidate) || candidate.type !== "listItem") {
      continue;
    }
    const children = Array.isArray(candidate.content)
      ? candidate.content
          .map((child) => sanitizeBlock(child))
          .filter(
            (child): child is Paragraph | BulletList | OrderedList =>
              child !== null &&
              (child.type === "paragraph" ||
                child.type === "bulletList" ||
                child.type === "orderedList"),
          )
      : [];
    items.push(
      children.length > 0
        ? { type: "listItem", content: children }
        : { type: "listItem" },
    );
  }
  return items;
}

/** Returns the cleaned block, or null when the block itself is not allowed. */
function sanitizeBlock(input: unknown): Block | null {
  if (!isRecord(input)) {
    return null;
  }

  switch (input.type) {
    case "paragraph": {
      const inline = sanitizeInline(input.content);
      return inline.length > 0
        ? { type: "paragraph", content: inline }
        : { type: "paragraph" };
    }
    case "heading": {
      const attrs = { level: headingLevel(input.attrs) };
      const inline = sanitizeInline(input.content);
      return inline.length > 0
        ? { type: "heading", attrs, content: inline }
        : { type: "heading", attrs };
    }
    case "bulletList": {
      const items = sanitizeListItems(input.content);
      return items.length > 0 ? { type: "bulletList", content: items } : null;
    }
    case "orderedList": {
      const items = sanitizeListItems(input.content);
      if (items.length === 0) {
        return null;
      }
      const start = isRecord(input.attrs) ? input.attrs.start : undefined;
      return typeof start === "number" && Number.isInteger(start)
        ? { type: "orderedList", attrs: { start }, content: items }
        : { type: "orderedList", content: items };
    }
    case "image":
      return sanitizeImage(input);
    default:
      // Unknown blocks go, and their whole subtree goes with them.
      return null;
  }
}

/**
 * Cleans rich text. Removes blocks and inline elements outside the allowed
 * set, drops marks and attrs it does not understand, and strips links and
 * images whose URL is not an absolute http(s) address. The returned content
 * always satisfies `contentSchema`. The only `ok: false` is input that is not
 * a document at all.
 */
export function sanitizeContent(input: unknown): SanitizeContentResult {
  if (
    !isRecord(input) ||
    input.type !== "doc" ||
    !Array.isArray(input.content)
  ) {
    return {
      ok: false,
      error: "Content must be a document with a list of blocks",
    };
  }

  const blocks = input.content
    .map((block) => sanitizeBlock(block))
    .filter((block): block is Block => block !== null);
  return { ok: true, content: { type: "doc", content: blocks } };
}

/**
 * zod schema for rich text arriving on a write path (seed files, organizer
 * forms, or a direct POST past the editor): sanitizes first, the same way
 * `sanitizeContent` always has, so a document holding an unrecognized block
 * (or an unsafe link/image URL) is cleaned rather than rejected outright.
 * The only failure is input that is not a document at all.
 */
export const contentInputSchema = z.unknown().transform((content, ctx) => {
  const result = sanitizeContent(content);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: result.error });
    return z.NEVER;
  }
  return result.content;
});
