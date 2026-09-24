"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type AnnouncementActionResult,
  createAnnouncement,
  updateAnnouncement,
} from "@/actions/announcements";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { ANNOUNCEMENT_TITLE_MAX, MAX_VIDEO_LINKS } from "@/lib/announcements";
import type { Content } from "@/lib/rich-text/content";
import { videoEmbedUrl } from "@/lib/video";

const fieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

const EMPTY_BODY: Content = { type: "doc", content: [] };

type Initial = {
  title: string;
  body: Content;
  videoUrls: string[];
  pinned: boolean;
};

/**
 * Write or edit one Announcement: title, rich-text body, up to five video
 * links, and whether it's pinned. The video hint is only a hint; the server
 * action is the authority on the allow-list and its error is what's shown.
 */
export function AnnouncementForm({
  announcementId,
  initial,
}: {
  /** Set when editing an existing Announcement. */
  announcementId?: string;
  initial?: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState<Content>(initial?.body ?? EMPTY_BODY);
  const [videoUrls, setVideoUrls] = useState<string[]>(
    initial?.videoUrls ?? [],
  );
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [result, setResult] = useState<AnnouncementActionResult | null>(null);

  function setVideoUrl(index: number, value: string) {
    setVideoUrls((urls) => urls.map((url, i) => (i === index ? value : url)));
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Blank rows are left-over "Add video link" clicks, not links.
    const input = {
      title,
      body,
      videoUrls: videoUrls.map((url) => url.trim()).filter(Boolean),
      pinned,
    };
    startTransition(async () => {
      const saved = announcementId
        ? await updateAnnouncement(announcementId, input)
        : await createAnnouncement(input);
      setResult(saved);
      if (!saved.ok) return;
      router.push("/admin/announcements");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label="Announcement"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input
          name="title"
          required
          maxLength={ANNOUNCEMENT_TITLE_MAX}
          className={fieldClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Body</span>
        <RichTextEditor content={body} onChange={setBody} label="Body" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Video links</legend>
        <p className="text-foreground/60 text-xs">
          YouTube, Loom, Vimeo or Google Drive links only
        </p>
        {videoUrls.map((url, index) => {
          const hint =
            url.trim() !== "" && videoEmbedUrl(url.trim()) === null
              ? "Not a recognized YouTube, Loom, Vimeo or Google Drive video link"
              : null;
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  aria-label={`Video link ${index + 1}`}
                  className={`${fieldClass} flex-1`}
                  value={url}
                  onChange={(event) => setVideoUrl(index, event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVideoUrls((urls) => urls.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              </div>
              {hint && (
                <p className="text-xs font-medium text-amber-600">{hint}</p>
              )}
            </div>
          );
        })}
        {videoUrls.length < MAX_VIDEO_LINKS && (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setVideoUrls((urls) => [...urls, ""])}
            >
              Add video link
            </Button>
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="pinned"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        Pinned (shown first in the feed and on the home page)
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Saving…"
            : announcementId
              ? "Save changes"
              : "Post Announcement"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/announcements")}
        >
          Cancel
        </Button>
        {result && !result.ok && !pending && (
          <p role="alert" className="text-destructive text-sm">
            {result.error}
          </p>
        )}
      </div>
    </form>
  );
}
