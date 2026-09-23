# War Weeker — Grill-Me Brief

Output of the grill-me session (2026-09-23). It records every decision, the final domain model and vocabulary, the ranked cut list, and the build plan. It is the input to `to-prd`. Read it together with [about.md](about.md) and [old-wikis/](old-wikis/).

**Hard deadline:** hackathon submission, **Friday 2026-09-25 at 10:00 AM**.

**The hackathon:** JG's **AI Connection Event**, Wed–Fri Sept 23–25 at JGHQ. It's an Atlas hackathon, so building with the Atlas plugin is part of the point. Full details are in [AI_Connection_Event_Agent_Optimized.md](AI_Connection_Event_Agent_Optimized.md). What matters here:
- **Submission:** a form describing what you built, due **Fri 10:00 AM**.
- **Demo:** at **Fri 12:00 PM**, *selected* builders get about **5 minutes** each, then questions.
- **Real build time:** about 1.5 working days, **solo**, alongside client work.
- **Token budget:** `/atlas-plan` and `/atlas-implement` use tokens quickly, so scope has to fit within them.
- **Pipeline:** `grill-me` ✅ → `to-prd` → `to-spec` → `/atlas-plan` → `/atlas-implement`.

---

## 1. Context

- **What:** an app built specifically for Jahnel Group's annual **War Week**.
- **Predecessor:** Competiscore (`../competiscore`). It was used for War Week last year and it worked, but it was built to be generic: Leagues, ELO, role tiers, invites, discovery. War Week only ever used its Events feature.
- **No historical data:** the Competiscore database is gone. History comes from `old-wikis/`.
- **Reuse:** this is a fresh codebase. It copies specific pieces from `../competiscore` and `../journeys` (see D17 and D24) and does not fork either one.

## 2. Decisions

| # | Decision |
|---|---|
| D1 | Build a War-Week-specific tool. Don't make Competiscore more generic. |
| D2 | **War Week** is the top-level container. It replaces Competiscore's "Event". |
| D3 | Use Event-side terms (Team, Participant, Organizer). Drop the League-side terms. |
| D4 | No importing of Competiscore data. |
| D5 | Stairs App integration is deferred. HQ Attendance is scored as points entered by hand. |
| D6 | Video in announcements is embedded by link. No uploads or hosting. |
| D7 | Solo build, about 1.5 days. |
| D8 | Judging criteria are unknown, so pick for demo impact over completeness. |
| D9 | Deploy on **Vercel** (live URL). Keep localhost as a demo fallback. The submission form gets the URL, the repo, a one-paragraph pitch, and a note on the Atlas pipeline. |
| D10 | The AI angle is MVP: **(a)** a read-only MCP server and **(b)** history extracted from `old-wikis/` by Claude. The Atlas workflow itself gets a ~20-second mention. |
| D11 | Support **any number of teams** and a **free-for-all** mode. Next year may be free-for-all. |
| D12 | **Standings can be hidden, then revealed.** One organizer toggle; revealing plays an animation. |
| D13 | **Mobile-first** for public pages. Admin pages only need to work on desktop. |
| D14 | **A new codebase.** Copy pieces from Competiscore and journeys where they help; don't fork. |
| D15 | Demo data: **War Week XI (2026) is the "live" War Week**, using its real theme, days, schedule, teams and competitions from the wiki. Points are fictional and seeded as of mid-week, and other gaps are filled with fictional data. History covers 2016–2025. **Status is set by hand** (upcoming / live / complete) and never derived from the clock. |
| D16 | Scoring model: a War Week has a **mode** (`teams` or `free-for-all`). Each **Points Entry** goes to a **team** or to a **participant**. **Team standings** are the team's own entries plus its members' entries from competitions marked **counts toward team** (leaving it off covers 2025's immunity). An **individual leaderboard** always exists and is the main leaderboard in free-for-all mode. The hide/reveal toggle applies to the main leaderboard. |
| D17 | Stack: Next.js, TypeScript, Tailwind + shadcn, Drizzle, Postgres (Neon in prod, Docker locally), better-auth, zod, recharts, vitest, pnpm. Copy Competiscore's `auth.ts`, `db/index.ts` (the `DBOrTx` pattern) and chart components. Leave its events schema and services behind. |
| D18 | Auth: **anyone can read without signing in.** Organizers sign in with **Google, restricted to `@jahnelgroup.com`**. An env flag can require sign-in for all pages later. |
| D19 | Roles: **Organizer** (all writes; an email allowlist per War Week) and everyone else (read-only). Leaders are labels, not permissions. |
| D20 | Points entry is a **ledger only**: competition, team or participant, points (decimals allowed), note. The form warns when an entry exceeds the competition's max points. For ties, enter the same points for each. |
| D21 | **Awards** are entered by hand: name, description, recipients (participants and/or a team). They don't affect points, and nothing is computed from hours. Seed XI's awards from the wiki. |
| D22 | **History:** a card per year with edition, dates, story theme, teams and colors, winner, awards, highlights and the wiki link. 2016–2018 are link-only cards. No per-person history. |
| D23 | **Schedule:** Days have a date and a day theme. Schedule items have start time, optional end time, title, host, location, virtual link, description, category (competition / education / social / meal / work) and an optional linked competition. Meals are a category, not an entity. There are no recurring items; daily events are seeded once per day. All times are ET. Competitions without a slot have no schedule item. |
| D24 | **Rich text:** copy the **journeys TipTap v3 editor** (`../journeys/src/components/journeys/rich-text-editor.tsx`, `src/lib/rich-text/*`, `src/components/runner/rich-text.tsx`, `src/lib/graph/content.ts`). It stores ProseMirror JSON in `jsonb`. The whole app uses **shadcn base-nova (Base UI)** so the editor copies over unchanged. Video goes in a separate `videoUrls` list on announcements, validated against an allow-list (YouTube, Loom, Vimeo, Drive) and rendered as responsive iframes. Announcements are organizer-only, with a pinned flag and no Slack cross-post. The War Week's **single** Slack channel is shown prominently. FAQ answers use the same editor. |
| D25 | **Appearance theme** (on the War Week): primary and accent colors, logo, banner, a font preset (2–3 options), team label (House / Tribe / Team) and leader title (Head of House / Captain). No renaming of days or other vocabulary. Seed XI with a Matrix theme. Each archived year renders in its own theme. |
| D26 | **Admin UI covers only what changes during the week:** points entry (create / edit / delete), announcements, awards, and the reveal toggle. **Setup is seed-only:** a validated JSON file per War Week, loaded by a script. |
| D27 | **MCP server:** remote Streamable HTTP at `/api/mcp` on the same deploy, read-only, no auth. Tools: `get_current_war_week`, `get_leaderboard(kind: team\|individual)`, `get_schedule(date?)`, `get_announcements(limit?)`, `get_awards`, `get_faq`, `list_history`, `get_history(year)`. **While standings are hidden, `get_leaderboard` returns "hidden until closing ceremonies".** |
| D28 | **Extraction pipeline:** `scripts/extract` sends each `old-wikis/*.txt` file to the Claude API (`claude-sonnet-5`, structured output against the seed's zod schemas) and writes `seed/<year>.json`. The output is fixed by hand and committed. It runs once at dev time, never at runtime. |
| D29 | **Live updates:** poll with `router.refresh()` every ~10 seconds on the home and leaderboard pages. No websockets. |
| D30 | **FAQ** is in the MVP: an ordered list of question and answer pairs per War Week, seeded from XI and edited only through the seed. |
| D31 | **Stairs:** no code. Write `docs/stairs-integration.md` describing the future integration: per-participant HQ days over a date window, turned into points by a rule, keyed by email. It should include the findings in §9a. |
| D32 | **URLs:** `/` is the current War Week. `/[edition]` holds War Week pages (`/xi`, `/xi/schedule`, `/xi/leaderboard`, …). `/history` is the archive. `/admin` is for organizers. On mobile, a bottom tab bar with Home · Schedule · Leaderboard · News · More. |
| D33 | **Home page:** a banner with the edition and story theme, today's day theme, what's on now or next, a compact leaderboard (or "Standings hidden 🔒"), the pinned announcement, and the Slack channel button. |
| D34 | **Participants are records** with an optional **`email`**, which is the future join key to accounts, Stairs, and the same person across years. **Account linking** (a Google sign-in matched to a participant by email) is on the stretch list. |
| D35 | The 5-minute demo script is in §6. The seed has standings **hidden** so the reveal is the high point. |
| D36 | The ranked cut list is in §5. |
| D37 | **Build plan:** large unattended half-day slices (§7), because you'll be doing client work during the day. Each slice has a gate it checks itself: `tsc`, `lint`, `vitest` and `next build` pass, **plus a seed-and-render smoke test** (load the seed into a local Postgres; `/xi`, `/xi/leaderboard` and `/api/mcp` all respond). A slice that fails stops and reports rather than guessing. Tests focus on standings math (counts toward team, free-for-all, hidden state) and seed validation. |

## 3. What War Week is (from the user and `old-wikis/`)

- A **week-long, once-a-year company culture event**, generally in late February, Sunday through Friday. Remote employees travel to HQ.
- Numbered editions: 2016 was the first; 2025 was **X** and 2026 was **XI**.
- Each year has a **story theme**: The Matrix (2026), Survivor (2025, tribes), Battle of the Bands (2024, genres), Harry Potter (2023, houses).
- **Three kinds of activity:** competitions (team or individual), education (symposiums, round tables, speakers), and social (meals, workouts, headshots, open house, closing ceremonies).
- Every day has a **day theme**.
- Regular work continues: billable hours, War Week projects, an hours cutoff.

| Year | Structure | Team label | Leaders |
|---|---|---|---|
| 2023 | 4 houses | House | Head of House |
| 2024 | 3 music genres | Genre / Band | — |
| 2025 | Tribes, plus individual immunity | Tribe | — |
| 2026 | Red vs Blue | Team | Ship Captains |

Scoring is a points ledger per competition, with point values that can be fixed, capped or fractional. Brackets are run outside any app. Some competitions have no time slot (HQ Attendance, survey rate, Subjective Points). Competitions can be grouped ("Team Night Events"). Awards and honor societies (Midnight Club, Four Score, Centurion, MVPs, Core Values) change from year to year.

**Pain point:** the 2026 wiki names three Slack channels. The app becomes the single source of truth.

## 4. Final domain model

| Entity | Fields |
|---|---|
| **War Week** | edition (roman numeral + number), year, start and end dates, story theme, status (`upcoming` / `live` / `complete`), mode (`teams` / `free-for-all`), team label, leader title, Slack channel, standings hidden, appearance theme (primary and accent colors, logo, banner, font preset), wiki URL, organizer emails. For past years: **winner** (stored text, not computed) and **highlights**. History is just past War Weeks. |
| **Day** | War Week, date, day theme |
| **Schedule Item** | Day, start time, end time?, title, host?, location?, virtual link?, description (rich), category (`competition` / `education` / `social` / `meal` / `work`), Competition? |
| **Team** | War Week, name, color, logo? |
| **Participant** | War Week, display name, company tag?, email?, Team?, is leader |
| **Competition** | War Week, name, description, max points?, scoring (`team` / `individual`), counts toward team (individual only), group? |
| **Points Entry** | Competition, Team *xor* Participant, points (decimal), note?, entered by, entered at |
| **Award** | War Week, name, description, recipients (Participants and/or a Team) |
| **Announcement** | War Week, title, body (TipTap JSON), video URLs, pinned, author, published at |
| **FAQ Item** | War Week, question, answer (TipTap JSON), order |

### Domain vocabulary (for `CLAUDE.md ## Domain Vocabulary`)

| Term | Meaning |
|---|---|
| **War Week** | One annual edition. The top-level container. |
| **Edition** | The War Week's number (XI = 11). Used in URLs (`/xi`). |
| **Story Theme** | The year's narrative (The Matrix, Survivor). |
| **Day Theme** | A single day's theme ("Tournament Day"). |
| **Appearance Theme** | Colors, logo, banner and font preset for a War Week. |
| **Mode** | `teams` or `free-for-all`. Decides which leaderboard is the main one. |
| **Team** | A competing group. Displayed using the War Week's **Team Label**. |
| **Team Label** | What teams are called this year (House / Tribe / Team). |
| **Leader** / **Leader Title** | A participant flagged as a team leader, displayed with the year's title (Captain, Head of House). A label only, not a permission. |
| **Participant** | A person in a War Week. A record, not a user. |
| **Company Tag** | An optional affiliation label on a participant (LTI, IL, …). |
| **Organizer** | A signed-in `@jahnelgroup.com` user on the War Week's allowlist. The only role that can write. |
| **Competition** | Anything that awards points. Scored as team or individual. |
| **Competition Group** | An optional grouping of competitions ("Team Night Events"). |
| **Points Entry** | One ledger row: points awarded to a team or participant for a competition. |
| **Counts Toward Team** | Whether an individual competition's points also go to the participant's team. |
| **Standings** | The main leaderboard, computed from Points Entries. |
| **Reveal** | The organizer action that un-hides the standings, with an animation. |
| **Award** | A named honor given to participants or a team. It doesn't affect points. |
| **Announcement** | An organizer post (rich text plus video links). |
| **FAQ Item** | A question and answer pair for a War Week. |
| **Archive** | The past War Weeks shown at `/history`. |

**Words to avoid:** Event, League, Member, Match, ELO, Placeholder, Tournament.

## 5. Ranked cut list

Drop from the bottom if time runs out.

1. Schema and seed; themed current War Week home page; Google organizer sign-in; Vercel deploy
2. Leaderboard (team and individual, both modes); Points Entry admin; polling
3. Schedule
4. Reveal toggle and animation
5. MCP server
6. History archive (from extraction)
7. Announcements (TipTap editor and video list)
8. Awards
9. FAQ

**Stretch, in order:** account linking by email → "Which one is you?" picker (localStorage highlight) → placement presets → in-editor video node → `llms.txt` → setup CRUD screens.

**Cut:** Leagues, ELO, match and bracket tracking, multi-tenancy, video hosting, Slack cross-posting, hours tracking, projects board, sign-ups, AI chat inside the app, Stairs API.

## 6. Demo script (5 minutes)

1. **0:00** The hook: the hand-edited wiki drifts out of sync, and last year's page named three Slack channels.
2. **0:20** A QR code is on screen and the audience opens the app on their phones. They see the Matrix theme, today's day theme, and what's on now and next.
3. **1:00** The schedule, then the Red vs. Blue leaderboard.
4. **1:45** On the organizer laptop, enter points for a Team Night event. They show up on the projector and on phones within about 10 seconds.
5. **2:30** Post an announcement with an embedded video.
6. **3:00** Go to `/history` and open 2023 (Harry Potter). The theme changes. "Claude pulled this out of ten years of wiki pages."
7. **3:45** In Claude Desktop, ask "Who's winning War Week XI?" and get "Hidden until closing ceremonies." Press **Reveal**, the animation plays, ask again, and Claude answers.
8. **4:30** Close: built solo in 1.5 days with the Atlas pipeline, and ready for a free-for-all XII.

## 7. Build plan

| Slice | Work |
|---|---|
| **Wed PM** | `to-prd` → `to-spec` → `/atlas-plan`. Scaffold: Next.js, base-nova shadcn, Drizzle with local Docker Postgres, better-auth with Google restricted to jahnelgroup.com. Schema, zod seed schemas, run the extraction script, commit seed JSON. Skeleton deploy once Vercel is set up. |
| **Thu AM** | Cut-list items 1–3: home, leaderboard, points admin, polling, schedule. Mobile-first. |
| **Thu PM** | Items 4–7: reveal, MCP, history, announcements. Then items 8–9 if there's time. Skip the 5:30 roundtable only if you're behind. |
| **Fri 8:00–9:30** | Feature freeze. Polish, adjust the seed state, rehearse the demo script twice, **submit the form by 9:30**. |

Run `/atlas-implement` **once per slice**, not once for the whole spec, to stay within the token budget. Each slice must pass the D37 gate.

## 8. Prerequisites (things you have to do; an agent can't)

Credentials go in **`.env.local`**, which is gitignored. `.env.example` lists the variable names.

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Local: the Docker Postgres from `compose.yaml` (the agent sets this up). Prod: Neon, added to Vercel env vars later. |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally; the Vercel URL in prod |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth client (Web application) |
| `ANTHROPIC_API_KEY` | Anthropic Console. Only needed to run the extraction script. |

Google OAuth setup:
- Set the consent screen's user type to **Internal**, which limits sign-in to the JG Workspace. The app also checks the domain itself.
- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- Add the Vercel URL and `https://<vercel-domain>/api/auth/callback/google` once the Vercel project exists.

Later: the Vercel project linked to the repo, a Neon database, and the organizer email allowlist (it goes in the XI seed file).

## 9. Reference files

| Path | What |
|---|---|
| [about.md](about.md) | Original product idea |
| [AI_Connection_Event_Agent_Optimized.md](AI_Connection_Event_Agent_Optimized.md) | The hackathon: schedule, submission and demo rules, Atlas pipeline |
| [old-wikis/](old-wikis/) | Wiki pages, 2016–2026. Note the typo in the file name `2025..txt`. |
| `../competiscore/src/lib/server/auth.ts`, `src/db/index.ts`, `src/app/events/[id]/` charts | Pieces to copy (D17) |
| `../competiscore/CLAUDE.md` | Coding conventions worth carrying over (DBOrTx, text length limits in both the DB and zod) |
| `../journeys/src/components/journeys/rich-text-editor.tsx`, `src/lib/rich-text/*`, `src/components/runner/rich-text.tsx`, `src/lib/graph/content.ts` | Rich-text editor to copy (D24) |
| `../jg-stairapp-v2-backend` | Stairs App API: Express, Prisma, Postgres, Firebase Auth. For reference only (D5 / D31). |
| `../jg-stairapp-v2-frontend` | Stairs App UI: React, Vite, Firebase Hosting (`jg-stair-app-v2`). For reference only. |

### 9a. Stairs App findings (for `docs/stairs-integration.md`)

- **What it tracks:** stair **climbs that people log themselves**. It does not record attendance or badge swipes. To use it as an attendance proxy, count days where the `day` row is at least 1.
- **Identity:** `Users.id` is the user's `@jahnelgroup.com` Google email, which joins directly to `Participant.email` (D34). Exclude the synthetic `jg` user and any id containing "guest".
- **Data:** `Climbs` rows hold running totals per period (day, week, month, quarter, year, total), and `period_start_date` is a `YYYY-MM-DD` string. Entries can be undone (−200 to +200 per post), so take the snapshot **after** the window closes. Dates are in each user's browser-local time, and the server's current-period logic uses ET.
- **API:** every `/v1/*` route requires a Firebase ID token in the `Authorization` header. There are no API keys and no bulk date-range endpoint. The per-person endpoint is `GET /v1/climbs/<email>/day?start=&end=`.
- **Options:**
  - **B (recommended):** add an API-key-protected `GET /reports/range?start&end` endpoint to the Stairs backend. About 5–8 hours total.
  - **A:** call the per-person endpoint with a Firebase service identity.
  - **C:** read-only access to the Stairs database.
- **Blocker:** the Stairs backend has no documented deploy owner or base URL; it's only in a GitHub secret.
