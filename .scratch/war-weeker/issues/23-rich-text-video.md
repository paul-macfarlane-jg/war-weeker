# 23: Video inside rich text

**What to build:** Organizers can embed a video inside rich text (Announcement bodies and anywhere else the shared editor is used) from the editor toolbar, the same way images work today. Participants see a responsive embedded player.

**Blocked by:** none

**Status:** done

## Decisions

Proposed by Claude on 2026-09-24; implemented as written.

- **Hosts:** reuse `isAllowedVideoUrl` from `src/lib/video.ts` (YouTube, Loom, Vimeo, Drive). A URL outside the allow-list is refused in the editor with a message, and the node is dropped by the sanitizer.
- **Node:** a custom TipTap `video` block node with one attribute, `src`, holding the original URL. Share the conversion from share URL to embed URL with the existing Announcement video rendering; if there's no helper yet, add one to `src/lib/video.ts`. No new npm dependency: workers can't commit `pnpm-lock.yaml`.
- **Sanitizer and viewer:** `src/lib/rich-text/content.ts` allows the node only with an allow-listed `src`. `src/components/rich-text.tsx` renders a 16:9 `iframe` with `title`, `loading="lazy"`, `allow="fullscreen"` and a `referrerpolicy`. Plain-text extraction (`plain-text.ts`) renders it as the URL.
- **Toolbar:** a "Video" button beside "Image" that opens a URL field, following the image panel pattern.
- The existing separate Announcement video URL field stays as it is.

## Acceptance criteria

- [x] Unit tests: the sanitizer keeps an allow-listed video node and strips a disallowed or `javascript:` one; embed URL conversion works for each host; plain-text output covers the node.
- [x] Posting an Announcement with an embedded YouTube video renders the player on `/xi/news`. The screenshot is saved under `test-results/23-rich-text-video/`.
- [x] The spec stretch item 4 is marked delivered.
- [x] `pnpm gate` passes.

## Comments

- 2026-09-24 (Claude): Delivered on `feat/23-rich-text-video`.
  - `videoEmbedUrl` moved from `src/lib/announcements.ts` to `src/lib/video.ts` so the sanitizer, viewer, editor node and Announcement video links share it; its tests moved to `src/lib/video.test.ts`.
  - The sanitizer keeps a `video` block only when `videoEmbedUrl(src)` resolves: stricter than `isAllowedVideoUrl` alone, since an allow-listed host with no video id can't render.
  - Evidence: `scripts/rich-text-video-evidence.ts` drives the real editor (refused off-list URL, then a YouTube URL), posts, and asserts one embed on `/xi/news`; screenshots and `gate.txt` are in `test-results/23-rich-text-video/`.
  - The gate ran on a throwaway database (`war_weeker_t23`, dropped afterwards): ticket 22's evidence script was toggling the shared `smoke-organizer` allowlist entry on `war_weeker` at the same time.

