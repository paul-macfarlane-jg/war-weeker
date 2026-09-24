import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { toLeaderboardResult } from "@/mcp/leaderboard";
import { toScheduleResult } from "@/mcp/schedule";
import { toCurrentWarWeekResult } from "@/mcp/war-week";
import { getSchedule } from "@/queries/schedule";
import { getStandings } from "@/queries/standings";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_current_war_week",
      {
        title: "Get current War Week",
        description:
          "Returns the current War Week: the live one, else the next upcoming one, else the most recent complete one.",
        inputSchema: z.object({}),
      },
      async () => {
        // No outputSchema: the SDK rejects a declared schema without
        // structuredContent, and the no-current-War-Week result is a
        // different shape ({ warWeek: null }) from the populated one.
        const warWeek = await getCurrentWarWeek();
        const result = toCurrentWarWeekResult(warWeek);

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "get_leaderboard",
      {
        title: "Get leaderboard",
        description:
          "Returns the current War Week's team or individual Standings, ranked by total points. While standings are hidden it returns only a 'hidden until closing ceremonies' message and no numbers.",
        inputSchema: z.object({
          kind: z
            .enum(["team", "individual"])
            .describe("Which leaderboard: team standings or individual."),
        }),
      },
      async ({ kind }) => {
        const warWeek = await getCurrentWarWeek();
        const result = warWeek
          ? toLeaderboardResult(
              await getStandings(warWeek),
              kind,
              warWeek.teamLabel,
            )
          : { warWeek: null };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "get_schedule",
      {
        title: "Get schedule",
        description:
          "Returns the current War Week's schedule, grouped by Day with each Day Theme. Pass a date (YYYY-MM-DD) for one Day; omit it for the whole week. All times are ET (America/New_York) wall-clock HH:MM.",
        inputSchema: z.object({
          date: z.iso
            .date()
            .optional()
            .describe("A Day's date, YYYY-MM-DD. Omit for the full schedule."),
        }),
      },
      async ({ date }) => {
        const warWeek = await getCurrentWarWeek();
        const result = warWeek
          ? toScheduleResult(
              warWeek.edition,
              await getSchedule(warWeek.id, { date }),
              date,
            )
          : { warWeek: null };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );
  },
  { serverInfo: { name: "war-weeker", version: "0.1.0" } },
);

export { handler as GET, handler as POST };
