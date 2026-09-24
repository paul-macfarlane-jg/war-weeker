import { RichText } from "@/components/rich-text";
import type { Announcement } from "@/db/schema";
import { formatPublishedAt } from "@/lib/announcements";
import { videoEmbedUrl } from "@/lib/video";

export type AnnouncementCardData = Pick<
  Announcement,
  "title" | "body" | "videoUrls" | "pinned" | "authorEmail" | "publishedAt"
>;

/** One Announcement: title, author and time, body, then any video embeds. */
export function AnnouncementCard({
  announcement,
  headingLevel = "h2",
}: {
  announcement: AnnouncementCardData;
  /** The title element's heading level, so a page nests headings correctly. */
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Heading className="text-lg font-semibold">
          {announcement.title}
        </Heading>
        {announcement.pinned ? (
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            Pinned
          </span>
        ) : null}
      </div>
      <p className="text-foreground/60 text-xs">
        {announcement.authorEmail} ·{" "}
        {formatPublishedAt(announcement.publishedAt)}
      </p>
      <RichText content={announcement.body} />
      {announcement.videoUrls.map((url, index) => {
        const src = videoEmbedUrl(url);
        if (!src) return null;
        return (
          <iframe
            key={`${index}-${url}`}
            src={src}
            title={`Video: ${announcement.title}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-lg"
          />
        );
      })}
    </article>
  );
}
