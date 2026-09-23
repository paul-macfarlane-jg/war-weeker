# Responsive primary navigation — evidence

- `desktop-home.png`, `desktop-leaderboard.png`: 1440×900, `pnpm start` against seeded local Postgres. Top header nav with active state; no bottom tab bar.
- Mobile (375×812, in-app browser device emulation): `innerWidth 375`, `scrollWidth 375` (no horizontal scroll), `<header>` `display: none`, bottom tab bar `display: block` with all five tabs.
- `pnpm typecheck`, `pnpm lint` (0 errors), `pnpm test` (17/17), `pnpm build`, `pnpm smoke` (all `ok`).
