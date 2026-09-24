# 14: Installable PWA with per-platform install instructions

**What to build:** A participant can install War Weeker to their home screen as a Progressive Web App and launch it full-screen like a native app. An "Install app" page at `/install`, reachable from the More tab, detects the visitor's device and shows the matching steps: iOS Safari (Share → Add to Home Screen), Android Chrome (the browser's install prompt, with manual ⋮ → Install app / Add to Home screen steps as a fallback), and a short note for desktop or other browsers. When the app is already running installed (standalone display mode), the page says so instead of showing steps.

**Blocked by:** 01

**Status:** done

- [x] Web app manifest (Next.js `app/manifest.ts`) with name, short name, start URL `/`, `display: standalone`, theme and background colors from the app theme, and 192px, 512px and maskable icons
- [x] iOS support: `apple-touch-icon`, `apple-mobile-web-app-capable` / status-bar metadata and a title, so Add to Home Screen gets the right icon and name
- [x] A minimal service worker is registered so Android Chrome sees the app as installable; offline caching is not required
- [x] `/install` detects iOS, Android or other from the user agent (client-side) and shows only that platform's steps, with a way to see the other platform's steps
- [x] On Android, when the browser fires `beforeinstallprompt`, `/install` shows an "Install" button that opens the native prompt
- [x] In standalone display mode, `/install` shows "You're using the installed app" and no steps
- [x] The More tab links to `/install`
- [x] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
- [ ] Manual check: Lighthouse/Chrome DevTools reports the manifest as installable; installing on a real iOS and Android device (or simulators) shows the correct icon and name and opens standalone

## Comments

- 2026-09-24 (implementation): The manifest's theme and background colors are `#171717`, the icon's background, not a War Week's colors: each War Week has its own Appearance Theme, and the installed app outlives any one edition. The service worker has no fetch handler; current Chrome doesn't need one to install. The manual check is still open: the embedded preview browser blocks service worker registration, so try installing on a real iPhone and Android phone. Also check that Google sign-in comes back into the installed app on iOS, since `start_url` `/` goes through sign-in. Gate evidence: `test-results/14-installable-pwa/gate.txt` (typecheck, lint, format, 314 tests, build, 112 smoke checks all PASS after merging staging; manual check BLOCKED). After #17 merged, `/install` got the `SiteFooter` too.
