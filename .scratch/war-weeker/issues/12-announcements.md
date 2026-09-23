# 12: Announcements

**What to build:** A participant reads a news feed of Announcements (pinned first, then newest first) with formatted text and embedded YouTube, Loom, Vimeo or Drive video, and sees the pinned Announcement on the home page. An Organizer writes Announcements in a rich-text editor (bold, italic, headings, lists, links, images by URL), adds video links (anything outside the allow-list is rejected), and can pin, unpin, edit and delete. A Claude user can ask for recent Announcements.

**Blocked by:** 08

**Status:** ready-for-agent

**Notes:** Copy the TipTap v3 editor from journeys; content is sanitized on write and again on render, using the content schema from 03.

- [ ] `/xi/news` orders pinned Announcements first, then by published-at descending
- [ ] Allow-listed video URLs render as embeds; a disallowed URL is rejected by the server action with a clear error (vitest test of the allow-list)
- [ ] The home page shows the pinned Announcement
- [ ] Organizer-only server actions create, edit, delete, pin and unpin, and record the author email and published-at
- [ ] Unsafe rich content is stripped on write and on render
- [ ] MCP `get_announcements(limit?)` returns recent Announcements as readable text
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
