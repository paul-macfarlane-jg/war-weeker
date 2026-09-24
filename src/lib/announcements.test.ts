import { describe, expect, it } from "vitest";

import {
  type AnnouncementInput,
  MAX_VIDEO_LINKS,
  isAnnouncementId,
  parseAnnouncementInput,
  sortAnnouncements,
  videoEmbedUrl,
} from "@/lib/announcements";

const validBody = { type: "doc", content: [] };

function baseInput(
  overrides: Partial<AnnouncementInput> = {},
): AnnouncementInput {
  return {
    title: "Kickoff",
    body: validBody,
    videoUrls: [],
    pinned: false,
    ...overrides,
  };
}

describe("parseAnnouncementInput", () => {
  it("accepts a valid Announcement, defaulting videoUrls and pinned", () => {
    const result = parseAnnouncementInput({
      title: "  Kickoff  ",
      body: validBody,
      videoUrls: [],
      pinned: false,
    });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Kickoff",
        body: validBody,
        videoUrls: [],
        pinned: false,
      },
    });
  });

  it("rejects an empty title", () => {
    expect(parseAnnouncementInput(baseInput({ title: "   " }))).toEqual({
      ok: false,
      error: "Title must not be empty.",
    });
  });

  it("rejects a title over 200 characters", () => {
    expect(
      parseAnnouncementInput(baseInput({ title: "x".repeat(201) })),
    ).toEqual({
      ok: false,
      error: "Title must be at most 200 characters.",
    });
  });

  it("rejects a malformed or wrong-protocol video URL", () => {
    for (const url of ["http://youtube.com/watch?v=x", "not-a-url"]) {
      expect(parseAnnouncementInput(baseInput({ videoUrls: [url] }))).toEqual({
        ok: false,
        error: "Video link 1 Invalid URL.",
      });
    }
  });

  it("rejects a well-formed https link on a disallowed host", () => {
    expect(
      parseAnnouncementInput(
        baseInput({ videoUrls: ["https://evil.example.com/watch?v=x"] }),
      ),
    ).toEqual({
      ok: false,
      error:
        "Video link 1 must be a YouTube, Loom, Vimeo or Google Drive video link.",
    });
  });

  it("rejects an allow-listed host with an unrecognized path", () => {
    expect(
      parseAnnouncementInput(
        baseInput({
          videoUrls: ["https://www.youtube.com/playlist?list=x"],
        }),
      ),
    ).toEqual({
      ok: false,
      error:
        "Video link 1 must be a YouTube, Loom, Vimeo or Google Drive video link.",
    });
  });

  it("names the offending video link by position", () => {
    expect(
      parseAnnouncementInput(
        baseInput({
          videoUrls: [
            "https://www.youtube.com/watch?v=abc",
            "https://evil.example.com/x",
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error:
        "Video link 2 must be a YouTube, Loom, Vimeo or Google Drive video link.",
    });
  });

  it("rejects a video link over 500 characters", () => {
    const overlong = `https://www.youtube.com/watch?v=abc&pad=${"x".repeat(500)}`;
    expect(
      parseAnnouncementInput(baseInput({ videoUrls: [overlong] })),
    ).toEqual({
      ok: false,
      error: "Video link 1 must be at most 500 characters.",
    });
  });

  it("rejects more than the maximum number of video links", () => {
    const urls = Array.from(
      { length: MAX_VIDEO_LINKS + 1 },
      () => "https://www.youtube.com/watch?v=abc",
    );
    expect(parseAnnouncementInput(baseInput({ videoUrls: urls }))).toEqual({
      ok: false,
      error: `Add at most ${MAX_VIDEO_LINKS} video links.`,
    });
  });

  it.each([
    "https://www.youtube.com/watch?v=abc",
    "https://youtu.be/abc",
    "https://loom.com/share/abc",
    "https://vimeo.com/12345",
    "https://drive.google.com/file/d/abc/view",
  ])("accepts an allow-listed video URL: %s", (url) => {
    expect(parseAnnouncementInput(baseInput({ videoUrls: [url] }))).toEqual({
      ok: true,
      value: expect.objectContaining({ videoUrls: [url] }),
    });
  });
});

describe("isAnnouncementId", () => {
  it("accepts a uuid and rejects everything else", () => {
    expect(isAnnouncementId("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    expect(isAnnouncementId("not-a-uuid")).toBe(false);
  });
});

describe("sortAnnouncements", () => {
  it("puts pinned first, then orders by published-at descending", () => {
    const a = { id: "a", pinned: false, publishedAt: new Date("2026-01-01") };
    const b = { id: "b", pinned: true, publishedAt: new Date("2026-01-02") };
    const c = { id: "c", pinned: false, publishedAt: new Date("2026-01-03") };
    const d = { id: "d", pinned: true, publishedAt: new Date("2026-01-01") };

    expect(sortAnnouncements([a, b, c, d]).map((row) => row.id)).toEqual([
      "b",
      "d",
      "c",
      "a",
    ]);
  });

  it("keeps original order among rows that tie on both keys", () => {
    const when = new Date("2026-01-01");
    const a = { id: "a", pinned: false, publishedAt: when };
    const b = { id: "b", pinned: false, publishedAt: when };
    expect(sortAnnouncements([a, b]).map((row) => row.id)).toEqual(["a", "b"]);
  });
});

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
