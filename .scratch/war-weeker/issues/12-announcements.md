# 12: Announcements

**What to build:** A participant reads a news feed of Announcements (pinned first, then newest first) with formatted text and embedded YouTube, Loom, Vimeo or Drive video, and sees the pinned Announcement on the home page. An Organizer writes Announcements in a rich-text editor (bold, italic, headings, lists, links, images by URL), adds video links (anything outside the allow-list is rejected), and can pin, unpin, edit and delete. A Claude user can ask for recent Announcements.

**Blocked by:** 08

**Status:** in-progress

**Notes:** Copy the TipTap v3 editor from journeys; content is sanitized on write and again on render, using the content schema from 03.

- [ ] `/xi/news` orders pinned Announcements first, then by published-at descending
- [ ] Allow-listed video URLs render as embeds; a disallowed URL is rejected by the server action with a clear error (vitest test of the allow-list)
- [ ] The home page shows the pinned Announcement
- [ ] Organizer-only server actions create, edit, delete, pin and unpin, and record the author email and published-at
- [ ] Unsafe rich content is stripped on write and on render
- [ ] MCP `get_announcements(limit?)` returns recent Announcements as readable text
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [EXECUTION PLAN] 2026-09-23

Owner: Claude Opus 5.5 orchestrator, branch `feat/12-announcements` off `staging` d286b9b; three sequential worker deliverables (D2 needs D1's actions and queries; D3 smokes both). No schema change (`announcement` exists with `video_urls`, `pinned`, `author_email`, `published_at`).

1. **D1 — read path, rules, writes, MCP** (worker, Sonnet):
   - Lib `src/lib/announcements.ts` (pure, vitest first): `announcementInputSchema` (title 1–200, body `contentInputSchema`, `videoUrls` each https ≤500 and `isAllowedVideoUrl`, `pinned`), `parseAnnouncementInput`, `sortAnnouncements` (pinned first, then published-at desc), `videoEmbedUrl(url)` → iframe `src` for YouTube (`watch?v=`, `youtu.be`, `shorts`), Loom `share`, Vimeo, Drive `file/d/<id>` or null, `isAnnouncementId`.
   - Queries `src/queries/announcements.ts`: `getAnnouncements(warWeek, {limit?})` sorted through the lib, `getPinnedAnnouncement(warWeek)`, `getAnnouncementForEdit(warWeek, id)`, `getAnnouncementWarWeek(id)`.
   - Mutations `src/mutations/announcements.ts`: create (records `authorEmail` = actor, `publishedAt` = now), update (keeps author and published-at, sets `updatedAt`), delete, `setAnnouncementPinned`; all scoped to `ctx.warWeekId`; DB tests in a rolled-back transaction.
   - Actions `src/actions/announcements.ts`: `createAnnouncement(input)`, `updateAnnouncement(id, input)`, `deleteAnnouncement(id)`, `pinAnnouncement(id)`, `unpinAnnouncement(id)`; current War Week for create, the Announcement's War Week otherwise; `requireOrganizer` first; revalidate `/admin` and `/<edition>` layouts.
   - Public: `/[edition]/news` feed (`AnnouncementCard` with `RichText`, `VideoEmbed` iframes, author, published-at ET, pinned badge); the pinned Announcement on the edition home; MCP `get_announcements(limit?)` via `src/mcp/announcements.ts` (`toAnnouncementsResult`, body as plain text) registered in `/api/mcp`.
2. **D2 — Organizer editor** (worker, Opus): TipTap v3 (`@tiptap/react`, `starter-kit`, `extension-image`, `pm`) copied from journeys and narrowed to this repo's content set (no caption); `src/lib/rich-text/extensions.ts`; `RichTextEditor` client component sanitizing on every update; `AnnouncementForm` (title, editor, video URL list with inline allow-list hint, pinned); `/admin/announcements` list with Edit / Pin–Unpin / Delete, `/admin/announcements/new`, `/admin/announcements/[id]`; enable the nav item in `AdminShell`; overview copy.
3. **D3 — smoke and evidence** (worker, Sonnet): smoke checks for feed order, embed iframes, home pinned card, refusal off the allowlist, disallowed video URL rejected, `javascript:` link stripped on write, create/edit/pin/unpin/delete with author email, MCP `get_announcements`; `scripts/announcements-evidence.ts` screenshots into `test-results/12-announcements/`; `gate.txt`.

Verification map (per `docs/agents/testing.md`; evidence committed under `test-results/12-announcements/`):

| Criterion | Proof | Earliest |
|---|---|---|
| AC1 feed order | vitest `sortAnnouncements`; smoke `/xi/news` order (pinned welcome first, then newest) | D1 / D3 |
| AC2 allow-list | vitest `announcementInputSchema` rejects `evil.example.com`, accepts the four hosts; smoke `createAnnouncement` with a bad URL returns a clear error; smoke `/xi/news` has a YouTube iframe | D1 / D3 |
| AC3 home pinned | smoke `/xi` contains the pinned title; screenshot | D1 / D3 |
| AC4 organizer actions | mutation DB tests; smoke non-Organizer refused, Organizer create→edit→pin→unpin→delete with `author_email` = smoke organizer | D1 / D3 |
| AC5 unsafe content stripped | vitest sanitizer already; smoke create with `javascript:` link → stored body has no such href; render via `RichText` | D3 |
| AC6 MCP | vitest `toAnnouncementsResult`; smoke `tools/call get_announcements` returns titles as text | D1 / D3 |
| DoD gate | `pnpm gate` exit 0, output in `gate.txt` | after D3 |
