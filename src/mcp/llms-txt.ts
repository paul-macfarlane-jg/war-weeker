import { REPO_URL } from "@/components/site-footer";
import { MCP_TOOLS } from "@/mcp/tools";

const PAGES: [path: string, purpose: string][] = [
  ["/", "Redirects to the current War Week's home."],
  [
    "/<edition>",
    "A War Week's home (edition as a lowercase Roman numeral, e.g. /xi): what's on now and next, pinned Announcements.",
  ],
  ["/<edition>/leaderboard", "Team and individual Standings."],
  ["/<edition>/schedule", "The schedule, grouped by Day with each Day Theme."],
  ["/<edition>/news", "Announcements, pinned first then newest first."],
  ["/<edition>/teams", "Teams and their rosters."],
  ["/<edition>/competitions", "Competitions and their results."],
  ["/<edition>/awards", "Awards and their recipients."],
  ["/<edition>/faq", "Frequently asked questions."],
  ["/<edition>/more", "Links to the rest of the War Week's pages."],
  ["/history", "The Archive of past War Weeks, 2016 onward."],
  ["/install", "How to install War Weeker as an app."],
  ["/admin", "Organizer-only: Points Entry, Standings, Announcements, Awards."],
  ["/sign-in", "Google sign-in with a @jahnelgroup.com account."],
];

/**
 * The `/llms.txt` body (llmstxt.org shape). Static copy only: it's served
 * without a session, so it must never include War Week data.
 */
export function llmsTxt(origin: string): string {
  const pages = PAGES.map(
    ([path, purpose]) => `- \`${path}\`: ${purpose}`,
  ).join("\n");
  const tools = Object.entries(MCP_TOOLS)
    .map(([name, tool]) => `- \`${name}\`: ${tool.description}`)
    .join("\n");

  return `# War Weeker

> War Weeker is where Jahnel Group organizers run War Week, the company's annual week of team competitions, and where participants follow it: themes, schedule, teams, competitions, points, awards and announcements, plus a history of past War Weeks.

Every page and API route except sign-in needs a signed-in Jahnel Group account.

## Pages

${pages}

## MCP

A read-only Model Context Protocol server over Streamable HTTP at ${origin}/api/mcp. Every tool returns only what a signed-in participant sees: hidden Standings stay hidden, and no tool returns an email.

${tools}

## Access

- Browser: sign in with Google using a @jahnelgroup.com account.
- MCP: send \`Authorization: Bearer <MCP_TOKEN>\`, a token the War Weeker operators issue. A signed-in browser session also works. Anything else gets 401.
- Claude Code: \`claude mcp add --transport http war-weeker ${origin}/api/mcp --header "Authorization: Bearer <MCP_TOKEN>"\`

## Source

- [GitHub repository](${REPO_URL})
`;
}
