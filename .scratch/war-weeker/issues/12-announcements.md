# 12: Announcements

**What to build:** A participant reads a news feed of Announcements (pinned first, then newest first) with formatted text and embedded YouTube, Loom, Vimeo or Drive video, and sees the pinned Announcement on the home page. An Organizer writes Announcements in a rich-text editor (bold, italic, headings, lists, links, images by URL), adds video links (anything outside the allow-list is rejected), and can pin, unpin, edit and delete. A Claude user can ask for recent Announcements.

**Blocked by:** 08

**Status:** done

**Notes:** Copy the TipTap v3 editor from journeys; content is sanitized on write and again on render, using the content schema from 03.

- [x] `/xi/news` orders pinned Announcements first, then by published-at descending
- [x] Allow-listed video URLs render as embeds; a disallowed URL is rejected by the server action with a clear error (vitest test of the allow-list)
- [x] The home page shows the pinned Announcement
- [x] Organizer-only server actions create, edit, delete, pin and unpin, and record the author email and published-at
- [x] Unsafe rich content is stripped on write and on render
- [x] MCP `get_announcements(limit?)` returns recent Announcements as readable text
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

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

### [AI CODE REVIEW] 2026-09-23

Two-axis review of `git diff staging...HEAD` by two fresh review agents; findings adjudicated by the orchestrator. Nothing blocking on either axis.

**Spec conformity**
- Some accepted video links never rendered: the allow-list checked only the host, while embeds needed a known path, so e.g. `loom.com/embed/…` or `youtube.com/playlist…` saved fine and then showed nothing. **Fixed**: a link is accepted only if it is a recognized YouTube, Loom, Vimeo or Drive video (`videoEmbedUrl` returns a src). Added Loom `/embed/` and YouTube `/live/`.
- Video ids were copied into the iframe src unchecked (a decoded `..%2F` could change the path on the embed host). **Fixed**: ids must match `[A-Za-z0-9_-]+` (digits for Vimeo).
- Non-Organizer refusal was smoke-tested only for create. **Fixed**: the smoke now checks that update, pin, unpin and delete refuse too.
- Nothing unit-tested that an unknown block is stripped on write. **Fixed**: `src/lib/rich-text/content.test.ts`. The render side was already covered by `rich-text.test.tsx`.
- Rows tied on pinned and published-at had no fixed order. **Fixed**: the query orders by published-at, then id. Duplicate iframe keys are fixed too.
- Only the newest pinned Announcement shows on the home page. Accepted, since AC3 is singular.
- The editor autolinked `mailto:` addresses, which the sanitizer then dropped. **Fixed**: autolink is off.

**Standards**
- The seed copied the title rule instead of using the lib's. **Fixed**: it uses `announcementTitleSchema`.
- Wrong error text for more than 5 links, links over 500 characters, and malformed URLs. **Fixed**. The limits are exported constants that the form uses too.
- The smoke's home-page badge check matched the "Pinned" heading, so it could never fail. **Fixed**: it matches the badge markup.
- Every iframe was titled "Video", and the card heading was an h2 under the Pinned h2. **Fixed**: the iframe title includes the Announcement title, and the card heading is an h3 on the home page.
- The editor had its own URL test, unused ids, and a misplaced doc comment. **Fixed**: `isHttpUrl` is shared from `content.ts`.
- Kept:
  - `fieldClass` is duplicated across three forms (existing precedent).
  - `formatPublishedAt` is an alias of `formatLedgerTime`.
  - The evidence script copies the archive helpers (a one-off, as before).

**Approved deviations**
- `contentInputSchema` now sanitizes first, stripping unknown blocks instead of rejecting the whole document. The D3 AC5 smoke found this. It matches `sanitizeContent`'s documented contract and applies to all seed rich text.
- The video allow-list refinement and `toPlainText` moved into `src/lib/` so each rule lives once (ADR 0001).

### [CLOSEOUT] 2026-09-23

- Repository: `war-weeker`, branch `feat/12-announcements` → PR into `staging` (URL in the PR). Base d286b9b.
- Deliverables (orchestrator Claude Opus 5.5; review agents Opus):
  - D1 (Sonnet worker): lib, queries, mutations with DB tests, actions, `/xi/news`, the home Pinned section, and MCP `get_announcements`.
  - D2 (Opus worker): the TipTap v3 editor, `AnnouncementForm`, and the `/admin/announcements` list, new and edit pages.
  - D3 (Sonnet worker): smoke checks, the evidence screenshots, and the `contentInputSchema` fix.
  - R1 (Sonnet worker): review fixes.
  - Orchestrator inline fixes: the commit trailer and the https error wording.
- DoD (evidence in `test-results/12-announcements/`):
  - AC1 feed order, pinned first then newest: **PASS**. Covered by the `sortAnnouncements` vitest and by smoke checks of the `/xi/news` order before and after pin and unpin. See `phone-news.png` and `desktop-news.png`.
  - AC2 allow-listed videos embed, a disallowed URL is rejected with a clear error: **PASS**.
    - The vitest covers the allow-list and the embed shapes.
    - The smoke checks the YouTube iframe on `/xi/news`, and that `createAnnouncement` with `evil.example.com` returns the error and saves no row.
  - AC3 the home page shows the pinned Announcement: **PASS**. Smoke checks `/xi` for the Pinned section and badge. See `phone-home-pinned.png`.
  - AC4 Organizer-only create, edit, delete, pin and unpin, recording author email and published-at: **PASS**.
    - The mutation DB tests prove War Week scoping.
    - The smoke checks that a non-Organizer is refused on all five actions, and that the Organizer's create → edit → pin → unpin → delete keeps `author_email` and `published_at`.
    - See `desktop-admin-announcements.png` and `desktop-admin-new-announcement.png`.
  - AC5 unsafe rich content is stripped on write and on render: **PASS**.
    - The smoke stores a `javascript:` link, a `data:` image and an `iframe` block; the stored body contains none of them and the feed contains no `javascript:`.
    - Unit tests cover write (`content.test.ts`) and render (`rich-text.test.tsx`).
  - AC6 MCP `get_announcements(limit?)`: **PASS**. The serializer has a vitest. The smoke checks that `tools/list` includes it, that `limit: 2` returns the pinned welcome first with its body text and video, and that no limit returns all 3.
  - Slice gate: **PASS**. `pnpm gate` exited 0 with typecheck, lint (0 errors), 295 tests, the build and 92 smoke checks (0 FAIL). See `gate.txt`. The `ELIFECYCLE 143` line in it is the smoke stopping its own server.
- Deviations: see the AI Code Review above. No schema change was needed; the new dependencies are the TipTap v3 packages.
- Run: `docker compose up -d && pnpm gate`, then `pnpm tsx scripts/announcements-evidence.ts` for the screenshots (needs Google Chrome).
- Isolation: direct checkout, sequential D1 → D2 → D3, chosen for real code dependencies (D2 imports D1's actions, D3 smokes both), not file conflicts.
