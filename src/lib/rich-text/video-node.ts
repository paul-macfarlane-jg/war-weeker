import { Node, mergeAttributes } from "@tiptap/core";

import { VIDEO_IFRAME, videoEmbedUrl } from "@/lib/video";

/**
 * The editor's `video` block: an atom holding one attribute, `src`, the
 * video's original share URL. The editor draws the same embed the viewer
 * does (`videoEmbedUrl`) so an Organizer sees what they inserted; the
 * sanitizer drops any `src` that does not resolve to an embed.
 */
export const Video = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-video-src"),
        renderHTML: (attributes) => ({ "data-video-src": attributes.src }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-video-src]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const embed =
      typeof node.attrs.src === "string" ? videoEmbedUrl(node.attrs.src) : null;
    const wrapper = mergeAttributes(HTMLAttributes, {
      class: "aspect-video w-full overflow-hidden rounded-lg",
    });
    if (!embed) return ["div", wrapper];
    return [
      "div",
      wrapper,
      [
        "iframe",
        {
          src: embed,
          title: VIDEO_IFRAME.title,
          allow: VIDEO_IFRAME.allow,
          loading: VIDEO_IFRAME.loading,
          referrerpolicy: VIDEO_IFRAME.referrerPolicy,
          // Clicks select the node instead of starting playback mid-edit.
          class: "pointer-events-none h-full w-full",
        },
      ],
    ];
  },
});
