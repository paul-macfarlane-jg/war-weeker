import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { toCurrentWarWeekResult } from "@/mcp/war-week";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_current_war_week",
      {
        title: "Get current War Week",
        description:
          "Returns the current War Week: the live one, else the most recent upcoming one, else the most recent complete one.",
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
  },
  { serverInfo: { name: "war-weeker", version: "0.1.0" } },
);

export { handler as GET, handler as POST };
