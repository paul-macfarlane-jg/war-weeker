/** Hosts an Announcement video URL may point at (YouTube, Loom, Vimeo, Drive). */
const ALLOWED_VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "loom.com",
  "www.loom.com",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
  "drive.google.com",
]);

/** Whether a URL is an https link to an allow-listed video host. */
export function isAllowedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      ALLOWED_VIDEO_HOSTS.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
