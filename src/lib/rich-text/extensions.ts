import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

import { Video } from "@/lib/rich-text/video-node";

/**
 * The TipTap extensions the Organizer's rich-text editor writes with. Copied
 * from journeys and narrowed to the closed set `@/lib/rich-text/content`
 * describes: paragraph, headings, bold, italic, bullet and ordered lists,
 * links, an image with alt text (no caption), and a video by URL.
 * Everything else StarterKit would bring is switched off; undo/redo, the
 * drop cursor and the gap cursor stay, since they emit no content of their
 * own.
 */
export const editorExtensions = [
  StarterKit.configure({
    blockquote: false,
    code: false,
    codeBlock: false,
    hardBreak: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    listKeymap: false,
    trailingNode: false,
    link: {
      openOnClick: false,
      // A typed or pasted non-http link (e.g. `mailto:`, `javascript:`) would
      // otherwise autolink in the editor and then be silently dropped by
      // the sanitizer on save, leaving the Organizer's text unexpectedly
      // unlinked.
      autolink: false,
      HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
    },
  }),
  Image,
  Video,
];
