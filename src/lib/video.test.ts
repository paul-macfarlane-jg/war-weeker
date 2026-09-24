import { describe, expect, it } from "vitest";

import { videoEmbedUrl } from "@/lib/video";

describe("videoEmbedUrl", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=abc123",
      "https://www.youtube-nocookie.com/embed/abc123",
    ],
    [
      "https://youtu.be/abc123",
      "https://www.youtube-nocookie.com/embed/abc123",
    ],
    [
      "https://www.youtube.com/shorts/abc123",
      "https://www.youtube-nocookie.com/embed/abc123",
    ],
    [
      "https://www.youtube.com/embed/abc123",
      "https://www.youtube-nocookie.com/embed/abc123",
    ],
    [
      "https://www.youtube.com/live/abc123",
      "https://www.youtube-nocookie.com/embed/abc123",
    ],
    ["https://loom.com/share/abc123", "https://www.loom.com/embed/abc123"],
    ["https://loom.com/embed/abc123", "https://www.loom.com/embed/abc123"],
    ["https://vimeo.com/123456", "https://player.vimeo.com/video/123456"],
    [
      "https://player.vimeo.com/video/123456",
      "https://player.vimeo.com/video/123456",
    ],
    [
      "https://drive.google.com/file/d/abc123/view?usp=sharing",
      "https://drive.google.com/file/d/abc123/preview",
    ],
    // Only the first youtu.be path segment names the video.
    ["https://youtu.be/abc/def", "https://www.youtube-nocookie.com/embed/abc"],
  ])("embeds %s", (url, expected) => {
    expect(videoEmbedUrl(url)).toBe(expected);
  });

  it.each([
    "https://evil.example.com/watch?v=abc123",
    "https://www.youtube.com/",
    "https://www.youtube.com/playlist?list=x",
    "https://vimeo.com/not-a-number",
    "https://drive.google.com/drive/folders/abc123",
    "https://drive.google.com/file/d/../x",
    "not-a-url",
    // A `v` param carrying an encoded `/` is not a bare id.
    "https://www.youtube.com/watch?v=..%2F..%2Fx",
    // An encoded `/` inside a youtu.be path segment is not a bare id either.
    "https://youtu.be/a%2Fb",
  ])("returns null for %s", (url) => {
    expect(videoEmbedUrl(url)).toBeNull();
  });
});
