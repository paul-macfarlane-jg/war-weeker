# 08: Organizer sign-in and admin gate

**What to build:** An Organizer signs in with their `@jahnelgroup.com` Google account and reaches `/admin` for the current War Week. A JG employee who isn't on that War Week's organizer allowlist can sign in but has no write access, and `/admin` refuses them. A non-JG Google account is refused at sign-in. An env flag can switch the whole app to require sign-in for reads.

**Blocked by:** 01

**Status:** done

**Human prerequisites:** a Google OAuth client with Internal consent and a redirect `/api/auth/callback/google` on localhost; `BETTER_AUTH_SECRET` and the OAuth values in `.env.local`.

**Notes:**
- better-auth with Google only, copied from Competiscore with other providers removed.
- The auth tables are a Drizzle schema change, and this is an auth/access change: red-team the plan, and keep the demo seed and migration together (repo policy).
- Organizer = a signed-in user whose email is on the War Week's allowlist. There are no other roles.

- [x] Sign-in rejects any email outside `@jahnelgroup.com` server-side, even if the consent screen were misconfigured; covered by a vitest test of the email check
- [x] A shared, reusable organizer check (signed-in email on that War Week's allowlist) is used by the `/admin` gate, and later server actions will use it too; covered by a vitest test
- [x] `/admin` shows a desktop admin shell to Organizers and refuses signed-in non-organizers and anonymous users
- [x] ~~With the require-sign-in env flag on, public pages redirect anonymous users to sign-in, and `/api/mcp` behavior is documented. With it off (default), reads stay public~~ Superseded by [SCOPE CHANGE] 2026-09-23: every page always requires sign-in, with no flag, and `/api/mcp` answers 401 without a session (documented)
- [ ] Human-gated check: the developer signs in locally with an allowlisted account and reaches `/admin`, then with a non-allowlisted JG account and is refused
- [x] Smoke still passes with no OAuth credentials present
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report

## Comments

### [EXECUTION PLAN] 2026-09-23

Route: `/implement 08` in the main session (Claude Opus 5.5), TDD at the pure `src/lib/access.ts` seam. Red-team required by `docs/agents/planning.md` (Drizzle schema change + auth/access change); run on this plan before implementation code lands.

- **Dependency:** `better-auth` 1.7.5, Google provider only, no email/password, no other plugins.
- **Schema + migration:** add better-auth's core tables to `src/db/schema.ts` (`user`, `session`, `account`, `verification`, text ids) and generate `drizzle/0002_*`. No seed change: the XI seed already carries `organizerEmails: ["pmacfarlane@jahnelgroup.com"]`, and auth rows are runtime data that `--reset` never touches. Smoke confirms migrate + seed still pass.
- **Pure rules (`src/lib/access.ts`, tests first):**
  - `isJahnelGroupEmail(email)`: trimmed, case-insensitive, exactly one `@`, domain exactly `jahnelgroup.com` (rejects subdomains, `jahnelgroup.com.evil.com`, `a@evil.com@jahnelgroup.com`, empty).
  - `isOrganizer(email, warWeek)`: JG email AND on `organizerEmails` (case-insensitive). The one shared organizer check.
  - `adminAccess(email, warWeek)`: `"anonymous" | "not-organizer" | "organizer"`.
  - `isRequireSignInOn(value)`: `"true"`/`"1"` only; default off.
  - `isAlwaysPublicPath(pathname)`: `/sign-in`, `/api/auth/*`, `/api/mcp` (and subpaths).
  - `safeCallbackPath(value)`: only same-origin relative paths (`/x`, not `//x`, not `/\x`), else `/`.
- **Server auth (`src/auth/server.ts`):** `betterAuth` with the Drizzle adapter; Google registered only when `GOOGLE_CLIENT_ID`/`SECRET` are set (so smoke runs without them), with `hd: "jahnelgroup.com"` (hint + verified-claim check) and `prompt: "select_account"`. Server-side domain rule regardless of consent-screen config: `databaseHooks.user.create.before` and `user.update.before` throw `APIError("FORBIDDEN")` for non-JG emails, so no non-JG user row or session is ever created. `getSessionEmail()` (per-request `cache`) also drops any session whose email fails `isJahnelGroupEmail` (defense in depth).
- **Shared organizer check (`src/auth/organizer.ts`):** `getAdminAccess(warWeek)` for pages and `requireOrganizer(warWeek)` → `{ ok: true, email } | { ok: false, error }` for tickets 09+ server actions (ADR 0001 shape, never throws on a user error). Both call `isOrganizer`.
- **Routes:** `src/app/api/auth/[...all]/route.ts` (`toNextJsHandler`); `/sign-in` page with a "Sign in with Google" client button (`callbackURL` via `safeCallbackPath`, shows `?error=` e.g. a refused non-JG account, and a "not configured" note when Google creds are absent); `/admin` for the current War Week: anonymous → redirect `/sign-in?callbackURL=/admin`, signed-in non-organizer → refusal page (their email, "not an organizer for War Week XI", sign out), Organizer → desktop admin shell (header with War Week + email + sign out, side nav for Points, Standings visibility, Announcements, Awards, each "Coming in a later slice"). `/admin` is `force-dynamic`.
- **Require-sign-in flag:** `REQUIRE_SIGN_IN` (default off, added to `.env.example`). `src/proxy.ts` (Next 16 proxy, Node runtime) does nothing when off. When on, any path that isn't always-public or a static asset validates the session with `auth.api.getSession` and redirects anonymous users to `/sign-in?callbackURL=<path>`. `/api/mcp` stays public even with the flag on (the spec makes MCP read-only and unauthenticated, and MCP clients can't complete Google sign-in); documented in README and CONTEXT.md.
- **Smoke (no OAuth creds needed):** child env gets a throwaway `BETTER_AUTH_SECRET` when none is set and `BETTER_AUTH_URL` = the smoke base URL. Checks: `/sign-in` renders; `/api/auth/get-session` answers with no session; anonymous `/admin` redirects to `/sign-in`; a smoke-inserted session (user + session rows, cookie signed with the secret via `better-auth/crypto`) for the XI organizer sees the admin shell, and one for a non-allowlisted JG email sees the refusal; smoke rows deleted afterwards. A second server on port 3101 with `REQUIRE_SIGN_IN=true`: anonymous `/xi` redirects to sign-in, `/sign-in` and `/api/mcp` initialize still work, a signed-in session reaches `/xi`.
- **Docs:** README auth setup + flag + MCP note; CONTEXT.md "Access rules".
- **Human-gated check:** can't be run by the agent (needs real Google OAuth); recorded as pending for the developer.

### [RED TEAM] 2026-09-23

Fresh-context `atlas-red-team-reviewer` against the plan and the in-progress code, with better-auth 1.7.5 source. Verdict: **approve-with-changes**, no blockers. Note: most of the code was already drafted when the review ran; the plan was fixed first, and every change below was applied before the gate.

- Should-fix 1, applied: the domain-rule `APIError` had no `code`, so better-auth's OAuth callback would re-throw a bare 403 instead of redirecting to `/sign-in?error=`. Now `code: "NOT_JAHNEL_GROUP"`, with a comment explaining why. No user row or session was ever written either way.
- Should-fix 2, applied: smoke sessions used the real XI Organizer email, which would collide with (and cleanup could cascade-delete) the developer's real user. Smoke now uses `smoke-*@jahnelgroup.com` / `smoke-*@example.com` users, adds `smoke-organizer@jahnelgroup.com` to XI's allowlist for the run and removes it in `finally`, and clears leftovers first.
- Should-fix 3, applied: session expiry is set in SQL (`now() + interval '1 day'`), avoiding timestamp-without-time-zone skew.
- Should-fix 4, already in: smoke servers get `GOOGLE_CLIENT_ID=""`/`GOOGLE_CLIENT_SECRET=""` and assert the "isn't configured" note, so the no-credentials criterion is proven even with `.env.local` filled in.
- Nits applied: README notes on the harmless CI "default secret" log line and per-environment `BETTER_AUTH_URL`/redirect URIs; `requireOrganizer` comment says to load the War Week from the row being changed, never client input; proxy matcher comment about extension paths; comment on why both smoke servers use an `http://` base URL (unprefixed cookie name).
- Decision for the developer to confirm: with `REQUIRE_SIGN_IN=true`, `/api/mcp` stays public. The spec calls the MCP server read-only with no auth and MCP clients can't do a Google sign-in, but spec line 227 / story 79 say the flag covers "all reads". The ticket AC only asks for MCP behavior to be documented; it is documented in README and CONTEXT.md.
- Confirmed sound: `hd` enforcement against the verified claim, `user.update.before` with partial data, email/password and change-email off, better-auth's own trusted-origin check on `callbackURL`, `safeCallbackPath`, path-segment matching, `--reset` not touching auth tables, per-page gate (not layout-only).

### [AI CODE REVIEW] 2026-09-23

Two-axis review (`/code-review`, base `staging`, commit 703d60b).

**Standards**
- Documented standards: no violations. No banned terms; ADR 0001 layering is respected (pages call a query plus the auth helper, pure rules live in `src/lib/access.ts` with tests written first); smoke covers the UI and admin gate.
- Smell, Repeated Switches: `assertAdminGate` in smoke switched on the expected outcome twice. Fixed with one `shows` map keyed by the outcome.
- Smell, inconsistent idiom: the smoke cleanup SQL interpolated constants while the insert above it used parameters. Fixed: `runQuery` takes params and every smoke-user query uses them.

**Spec**
- Every agent-checkable criterion is implemented, with no scope creep.
- Noted: story 79 says the flag should cover "read anything", but `/api/mcp` stays public. This is disclosed (see [RED TEAM]) and documented as the AC asks. It needs the developer's confirmation.
- Noted: a session with a non-JG email counts as anonymous, so `/admin` sends it to sign-in. This is intended defense in depth, and the code has a comment saying so.

### [CLOSEOUT] 2026-09-23

- Repository: war-weeker, branch `feat/08-organizer-sign-in-and-admin-gate`, base `staging`. All implementation by the main session (Claude Opus 5.5). Red-team by a fresh-context `atlas-red-team-reviewer`; review by two Sonnet sub-agents. TDD at the `src/lib/access.ts` seam.
- Deliverables:
  - `better-auth` 1.7.5, Google only.
  - Auth tables in `src/db/schema.ts` and `drizzle/0002_auth_tables.sql`. No seed change: XI already lists its Organizer.
  - `src/lib/access.ts` with tests.
  - `src/auth/server.ts`, `src/auth/organizer.ts`, `src/auth/client.ts`.
  - `/api/auth/[...all]`, `/sign-in`, `/admin` (`gate.ts`, `admin-shell.tsx`).
  - `src/proxy.ts` (`REQUIRE_SIGN_IN`).
  - Smoke extensions, README, CONTEXT.md "Access rules", and `.env.example`.
- DoD:
  - Sign-in rejects non-`@jahnelgroup.com` emails on the server: PASS.
    - `isJahnelGroupEmail` tests cover look-alike domains, subdomains and double `@`.
    - `databaseHooks.user.create/update.before` throws `NOT_JAHNEL_GROUP`, so no user or session row is written. Google `hd` checks the verified claim as well.
    - Smoke: a session with a non-JG email is treated as anonymous.
  - One shared organizer check, used by the `/admin` gate and ready for actions: PASS.
    - `isOrganizer` and `adminAccess` tests.
    - `getAdminAccess` and `requireOrganizer` both call `isOrganizer`.
  - `/admin` shows the desktop shell to Organizers and refuses non-organizers and anonymous users: PASS.
    - Smoke: anonymous users get a 307 to `/sign-in?callbackURL=%2Fadmin`; an Organizer session sees the shell; a JG non-organizer sees "Organizers only".
    - Screenshots: `test-results/admin-organizer-shell/`, `test-results/admin-refused-non-organizer/`, `test-results/sign-in/`.
  - Require-sign-in flag: PASS.
    - A second smoke server runs with `REQUIRE_SIGN_IN=true`. Anonymous `/xi` redirects to sign-in, a signed-in user reaches `/xi`, and `/api/mcp` initialize still works.
    - With the flag off, every existing public check passes.
    - MCP behavior is documented in README and CONTEXT.md.
  - Human-gated check (a real Google sign-in with an allowlisted account, then a non-allowlisted JG account): BLOCKED for the agent. It needs the developer's OAuth client in `.env.local`. **Pending for the developer**; see README "Organizer sign-in".
  - Smoke passes with no OAuth credentials: PASS. Both smoke servers force empty `GOOGLE_CLIENT_ID`/`SECRET` and assert the "isn't configured" note.
  - Slice gate: PASS. `test-results/08-gate/gate.log` shows `gate exit status: 0`, 204 vitest tests and 46 smoke checks.
- Deviations:
  - Most of the code was drafted while the red-team was running. Every change the red-team asked for was applied before the gate.
  - Open decision for the developer: `/api/mcp` stays public when `REQUIRE_SIGN_IN` is on.
- PR: see the PR into `staging` for this branch.

### [SCOPE CHANGE] 2026-09-23 (developer request after PR #15 opened)

- The developer: "every page requires a login". Sign-in is no longer optional, and the `REQUIRE_SIGN_IN` flag is removed. `src/proxy.ts` always requires a JG session: pages redirect to `/sign-in?callbackURL=…`, and API routes answer 401. Only `/sign-in` and `/api/auth/*` are public.
- The developer chose to lock down MCP too. `/api/mcp` needs a session like everything else, so MCP clients (Claude) can't connect until MCP-client auth is built. better-auth 1.7.5 has no MCP OAuth plugin, so that is follow-up work.
- The developer said they couldn't find where to sign in. Now every page sends anonymous visitors to sign-in. The desktop header shows the account email, Sign out, and an Admin link for current-War-Week Organizers; on mobile, More shows the account, Sign out and Admin.
- The desktop top nav from PR #5 had merged into `main`, not `staging`. It is restored in PR #16 (`fix/restore-desktop-nav`), merged into this branch.
- Updated: spec (stories 79 and 67 context, "Auth and access", MCP), README, CONTEXT.md "Access rules", and `.env.example`. Also `docs/agents/planning.md`: the MCP row now says it needs a session. That is a team-owned doc, so please review the change.
- Smoke: page checks run as a signed-in smoke user. New checks: anonymous `/`, `/xi` and `/xi/leaderboard` redirect to sign-in; anonymous `/api/mcp` gets 401; `/xi/more` shows the account, and shows the Admin link only to an Organizer. The second `REQUIRE_SIGN_IN` smoke server is gone.
- Evidence: `test-results/08-gate/gate.log` (`gate exit status: 0`, 192 vitest tests, 48 smoke checks). Screenshots: `test-results/desktop-home-signed-in-organizer/`, `test-results/mobile-more-account/`, and the refreshed sign-in/admin ones.

### [PROGRESS] 2026-09-23: themed sign-in page (developer request)

- `/sign-in` now uses the current War Week's Appearance Theme: colors, font, a primary-color glow, the banner, and the logo. It shows the edition, Story Theme, status and dates, with a full-width "Sign in with Google" button that carries the Google mark. It follows each year's theme with no code change, and falls back to the plain card when there is no current War Week.
- `formatDateRange` and the status labels moved to `src/lib/war-week-display.ts` (with a test), and the home page and sign-in share them.
- Screenshots: `test-results/sign-in/`, `test-results/sign-in-mobile/`, `test-results/sign-in-refused/`. These were rendered with placeholder Google client values, only so the button appears; there was no real OAuth.
- Gate: PASS (`test-results/08-gate/gate.log`, 193 vitest tests, 48 smoke checks).
