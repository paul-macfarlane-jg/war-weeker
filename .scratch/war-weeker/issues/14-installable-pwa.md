# 14: Installable PWA with per-platform install instructions

**What to build:** A participant can install War Weeker to their home screen as a Progressive Web App and launch it full-screen like a native app. An "Install app" page at `/install`, reachable from the More tab, detects the visitor's device and shows the matching steps: iOS Safari (Share → Add to Home Screen), Android Chrome (the browser's install prompt, with manual ⋮ → Install app / Add to Home screen steps as a fallback), and a short note for desktop or other browsers. When the app is already running installed (standalone display mode), the page says so instead of showing steps.

**Blocked by:** 01

**Status:** needs-triage

- [ ] Web app manifest (Next.js `app/manifest.ts`) with name, short name, start URL `/`, `display: standalone`, theme and background colors from the app theme, and 192px, 512px and maskable icons
- [ ] iOS support: `apple-touch-icon`, `apple-mobile-web-app-capable` / status-bar metadata and a title, so Add to Home Screen gets the right icon and name
- [ ] A minimal service worker is registered so Android Chrome sees the app as installable; offline caching is not required
- [ ] `/install` detects iOS, Android or other from the user agent (client-side) and shows only that platform's steps, with a way to see the other platform's steps
- [ ] On Android, when the browser fires `beforeinstallprompt`, `/install` shows an "Install" button that opens the native prompt
- [ ] In standalone display mode, `/install` shows "You're using the installed app" and no steps
- [ ] The More tab links to `/install`
- [ ] Slice gate passes: type-check, lint, vitest, production build, and the smoke test against seeded local Postgres; on failure, stop and report
- [ ] Manual check: Lighthouse/Chrome DevTools reports the manifest as installable; installing on a real iOS and Android device (or simulators) shows the correct icon and name and opens standalone
