import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { toAnnouncementsResult } from "@/mcp/announcements";
import { toAwardsResult } from "@/mcp/awards";
import { toFaqResult } from "@/mcp/faq";
import { toHistoryListResult, toHistoryResult } from "@/mcp/history";
import { toLeaderboardResult } from "@/mcp/leaderboard";
import { toScheduleResult } from "@/mcp/schedule";
import { toCurrentWarWeekResult } from "@/mcp/war-week";
import { getAnnouncements } from "@/queries/announcements";
import { getArchiveDetailByYear, listArchive } from "@/queries/archive";
import { getAwards } from "@/queries/awards";
import { getFaqItems } from "@/queries/faq";
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

    server.registerTool(
      "get_announcements",
      {
        title: "Get Announcements",
        description:
          "Returns the current War Week's recent Announcements as readable text, pinned first then newest first, with title, author, published time, plain-text body and any video links.",
        inputSchema: z.object({
          limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe(
              "How many Announcements to return, 1-50. Defaults to 10.",
            ),
        }),
      },
      async ({ limit }) => {
        const warWeek = await getCurrentWarWeek();
        const result = warWeek
          ? toAnnouncementsResult(
              warWeek.edition,
              await getAnnouncements(warWeek, { limit: limit ?? 10 }),
            )
          : { warWeek: null };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "get_awards",
      {
        title: "Get Awards",
        description:
          "Returns the current War Week's Awards by name, each with its description and recipients: a Team, Participants, or both. Awards don't affect Standings.",
        inputSchema: z.object({}),
      },
      async () => {
        const warWeek = await getCurrentWarWeek();
        const result = warWeek
          ? toAwardsResult(warWeek.edition, await getAwards(warWeek))
          : { warWeek: null };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "get_faq",
      {
        title: "Get FAQ",
        description:
          "Returns the current War Week's FAQ in order: each question with its answer as plain text.",
        inputSchema: z.object({}),
      },
      async () => {
        const warWeek = await getCurrentWarWeek();
        const result = warWeek
          ? toFaqResult(warWeek.edition, await getFaqItems(warWeek))
          : { warWeek: null };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "list_history",
      {
        title: "List War Week history",
        description:
          "Lists every past (complete) War Week in the Archive, newest first: edition, year, dates, Story Theme, stored winner and original wiki link.",
        inputSchema: z.object({}),
      },
      async () => {
        const result = toHistoryListResult(await listArchive());

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );

    server.registerTool(
      "get_history",
      {
        title: "Get a past War Week",
        description:
          "Returns one past War Week by year: Story Theme, dates, Teams and colors, the stored winner, Awards with recipients, highlights and the original wiki link. A year not in the Archive returns found: false.",
        inputSchema: z.object({
          year: z.number().int().describe("The War Week's year, e.g. 2023."),
        }),
      },
      async ({ year }) => {
        const result = toHistoryResult(
          year,
          await getArchiveDetailByYear(year),
        );

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      },
    );
  },
  { serverInfo: { name: "war-weeker", version: "0.1.0" } },
);

export { handler as GET, handler as POST };
