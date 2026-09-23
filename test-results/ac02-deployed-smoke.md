# AC: Smoke against the deployed URL (ticket 02)

- Target: `https://war-weeker.vercel.app` (Vercel production, deployment of `017e56c` on `main`)
- Run: 2026-09-23T19:45:27Z from a developer machine with curl
```
GET /        -> 307 https://war-weeker.vercel.app/xi
GET /xi      -> 200
GET /xi body contains 'XI': yes
GET /xi/leaderboard -> 200
GET /zz      -> 404

POST /api/mcp initialize:
event: message
data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"war-weeker","version":"0.1.0"}},"jsonrpc":"2.0","id":1}

POST /api/mcp tools/list:
event: message
data: {"result":{"tools":[{"name":"get_current_war_week","title":"Get current War Week","description":"Returns the current War Week: the live one, else the most recent upcoming one, else the most recent complete one.","inputSchema":{"type":"object","$schema":"https://json-schema.org/draft/2020-12/schema","properties":{}}}]},"jsonrpc":"2.0","id":2}

POST /api/mcp tools/call get_current_war_week:
event: message
data: {"result":{"content":[{"type":"text","text":"{\"edition\":\"xi\",\"editionNumber\":11,\"year\":2026,\"startDate\":\"2026-02-22\",\"endDate\":\"2026-02-27\",\"storyTheme\":\"The Matrix\",\"status\":\"live\",\"mode\":\"teams\",\"teamLabel\":\"Team\",\"leaderTitle\":\"Captain\",\"slackChannelUrl\":\"https://jahnelgroup.slack.com/archives/war-week-xi\",\"standingsHidden\":true}"}]},"jsonrpc":"2.0","id":3}
```

Verdict: PASS — `/` redirects to `/xi`, `/xi` and `/xi/leaderboard` return 200 with War Week XI, `/zz` 404s, and `/api/mcp` answers `initialize`, `tools/list` and `tools/call get_current_war_week` (edition `xi`) with no auth. Data comes from the production Neon database, migrated by the Migrate workflow on `main` and seeded by the Seed workflow (both green, 2026-09-23).
