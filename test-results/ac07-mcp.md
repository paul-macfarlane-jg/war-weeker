# AC7 — /api/mcp read-only Streamable HTTP, no auth, exposes get_current_war_week (final evidence)

No auth headers sent. mcp-handler v2 serves the stateless Streamable HTTP protocol over POST (GET returns 405 by design in v2; no SSE listener endpoint).

```
$ POST /api/mcp initialize
event: message
data: {"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"war-weeker","version":"0.1.0"}},"jsonrpc":"2.0","id":1}


$ POST /api/mcp tools/list
event: message
data: {"result":{"tools":[{"name":"get_current_war_week","title":"Get current War Week","description":"Returns the current War Week: the live one, else the most recent upcoming one, else the most recent complete one.","inputSchema":{"type":"object","$schema":"https://json-schema.org/draft/2020-12/schema","properties":{}}}]},"jsonrpc":"2.0","id":2}


$ POST /api/mcp tools/call get_current_war_week
event: message
data: {"result":{"content":[{"type":"text","text":"{\"edition\":\"xi\",\"editionNumber\":11,\"year\":2026,\"startDate\":\"2026-02-22\",\"endDate\":\"2026-02-27\",\"storyTheme\":\"The Matrix\",\"status\":\"live\",\"mode\":\"teams\",\"teamLabel\":\"Team\",\"leaderTitle\":\"Captain\",\"slackChannelUrl\":\"https://jahnelgroup.slack.com/archives/war-week-xi\",\"standingsHidden\":true}"}]},"jsonrpc":"2.0","id":3}
```
