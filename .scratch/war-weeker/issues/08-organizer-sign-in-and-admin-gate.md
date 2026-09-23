# 08: Organizer sign-in and admin gate

**What to build:** An Organizer signs in with their `@jahnelgroup.com` Google account and reaches `/admin` for the current War Week. A JG employee who isn't on that War Week's organizer allowlist can sign in but has no write access, and `/admin` refuses them. A non-JG Google account is refused at sign-in. An env flag can switch the whole app to require sign-in for reads.

**Blocked by:** 01

**Status:** ready-for-agent

**Human prerequisites:** a Google OAuth client with Internal consent and a redirect `/api/auth/callback/google` on localhost; `BETTER_AUTH_SECRET` and the OAuth values in `.env.local`.

**Notes:**
- better-auth with Google only, copied from Competiscore with other providers removed.
- The auth tables are a Drizzle schema change, and this is an auth/access change: red-team the plan, and keep the demo seed and migration together (repo policy).
- Organizer = a signed-in user whose email is on the War Week's allowlist. There are no other roles.

- [ ] Sign-in rejects any email outside `@jahnelgroup.com` server-side, even if the consent screen were misconfigured; covered by a vitest test of the email check
- [ ] A shared, reusable organizer check (signed-in email on that War Week's allowlist) is used by the `/admin` gate, and later server actions will use it too; covered by a vitest test
- [ ] `/admin` shows a desktop admin shell to Organizers and refuses signed-in non-organizers and anonymous users
- [ ] With the require-sign-in env flag on, public pages redirect anonymous users to sign-in, and `/api/mcp` behavior is documented. With it off (default), reads stay public
- [ ] Human-gated check: the developer signs in locally with an allowlisted account and reaches `/admin`, then with a non-allowlisted JG account and is refused
- [ ] Smoke still passes with no OAuth credentials present
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
