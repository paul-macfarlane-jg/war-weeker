import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { toCurrentWarWeekResult } from "@/mcp/war-week";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

const currentWarWeekOutputSchema = z.looseObject({
  edition: z.string().optional(),
  editionNumber: z.number().optional(),
  year: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  storyTheme: z.string().optional(),
  status: z.string().optional(),
  mode: z.string().optional(),
  teamLabel: z.string().optional(),
  leaderTitle: z.string().optional(),
  slackChannelUrl: z.string().optional(),
  standingsHidden: z.boolean().optional(),
  warWeek: z.null().optional(),
});

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_current_war_week",
      {
        title: "Get current War Week",
        description:
          "Returns the current War Week: the live one, else the most recent upcoming one, else the most recent complete one.",
        inputSchema: z.object({}),
        outputSchema: currentWarWeekOutputSchema,
      },
      async () => {
        const warWeek = await getCurrentWarWeek();
        const result = toCurrentWarWeekResult(warWeek);

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          ...("warWeek" in result ? {} : { structuredContent: result }),
        };
      },
    );
  },
  { serverInfo: { name: "war-weeker", version: "0.1.0" } },
);

export { handler as GET, handler as POST };
