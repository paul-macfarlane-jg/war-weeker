import { z } from "zod";

import { formatLedgerTime } from "@/lib/points-entry";
import { contentInputSchema } from "@/lib/rich-text/content";
import { isAllowedVideoUrl } from "@/lib/video";

/** The Announcement title, as limited by its column. */
export const announcementTitleSchema = z
  .string()
  .trim()
  .min(1, { error: "must not be empty" })
  .max(200, { error: "must be at most 200 characters" });

/**
 * An Announcement video link: an https URL within the column length, on one
 * of the allow-listed hosts (YouTube, Loom, Vimeo, Drive). The allow-list
 * itself lives once, in `isAllowedVideoUrl`; the seed schema reuses this.
 */
export const videoUrlSchema = z
  .url({ protocol: /^https$/ })
  .max(500)
  .refine(isAllowedVideoUrl, {
    message: "must be a YouTube, Loom, Vimeo or Google Drive URL",
  });

export const announcementInputSchema = z.object({
  title: announcementTitleSchema,
  body: contentInputSchema,
  videoUrls: z.array(videoUrlSchema).max(5).default([]),
  pinned: z.boolean().default(false),
});

/** The Announcement form's raw fields. */
export type AnnouncementInput = {
  title: string;
  body: unknown;
  videoUrls: string[];
  pinned: boolean;
};

export type AnnouncementValues = z.infer<typeof announcementInputSchema>;

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
};

/** Validates the Announcement form. Never throws; returns the first error. */
export function parseAnnouncementInput(
  input: AnnouncementInput,
): { ok: true; value: AnnouncementValues } | { ok: false; error: string } {
  const result = announcementInputSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  const issue = result.error.issues[0];
  if (issue.path[0] === "videoUrls") {
    const index = typeof issue.path[1] === "number" ? issue.path[1] : 0;
    return {
      ok: false,
      error: `Video link ${index + 1} must be a YouTube, Loom, Vimeo or Google Drive URL.`,
    };
  }
  if (issue.path[0] === "body") {
    return { ok: false, error: "Body must be valid rich text." };
  }

  const label = FIELD_LABELS[String(issue.path[0])];
  // Shared field schemas word their errors as "must …"; prefix the field.
  const message = issue.message.startsWith("must ")
    ? `${label} ${issue.message}.`
    : issue.message;
  return { ok: false, error: message };
}

const uuid = z.uuid();

/** Whether a URL segment or action argument is shaped like a row id. */
export function isAnnouncementId(id: string): boolean {
  return uuid.safeParse(id).success;
}

/**
 * Pinned Announcements first, then newest first by published-at. Stable:
 * rows that tie on both keep their original order.
 */
export function sortAnnouncements<
  T extends { pinned: boolean; publishedAt: Date },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
}

function matchPath(pathname: string, pattern: RegExp): string | null {
  const match = pathname.match(pattern);
  return match ? match[1] : null;
}

/**
 * The iframe `src` for an Announcement video link, or null when the URL
 * doesn't point at a recognized video on its host (including a host on the
 * allow-list with an unrecognized path). YouTube embeds use the
 * `-nocookie` domain.
 */
export function videoEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com"
  ) {
    const id =
      parsed.searchParams.get("v") ??
      matchPath(parsed.pathname, /^\/shorts\/([^/]+)/) ??
      matchPath(parsed.pathname, /^\/embed\/([^/]+)/);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\//, "");
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "loom.com" || host === "www.loom.com") {
    const id = matchPath(parsed.pathname, /^\/share\/([^/]+)/);
    return id ? `https://www.loom.com/embed/${id}` : null;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com") {
    const id = matchPath(parsed.pathname, /^\/(\d+)/);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") {
    const id = matchPath(parsed.pathname, /^\/video\/(\d+)/);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "drive.google.com") {
    const id = matchPath(parsed.pathname, /^\/file\/d\/([^/]+)/);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  return null;
}

/** An Announcement's published-at, in War Week time (ET). */
export const formatPublishedAt = formatLedgerTime;
