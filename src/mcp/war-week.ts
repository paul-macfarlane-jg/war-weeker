import { WarWeek } from "@/db/schema";

/**
 * Shape returned by the `get_current_war_week` MCP tool when a current War
 * Week exists.
 */
export type CurrentWarWeekResult = {
  edition: string;
  editionNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  storyTheme: string;
  status: WarWeek["status"];
  mode: WarWeek["mode"];
  teamLabel: string;
  leaderTitle: string;
  slackChannelUrl: string;
  standingsHidden: boolean;
};

/**
 * Serializes a War Week (or its absence) into the MCP tool payload shape
 * for `get_current_war_week`. Pure so the payload shape is a tested seam
 * independent of the MCP transport and the database.
 */
export function toCurrentWarWeekResult(
  warWeek: WarWeek | undefined,
): CurrentWarWeekResult | { warWeek: null } {
  if (!warWeek) return { warWeek: null };

  return {
    edition: warWeek.edition,
    editionNumber: warWeek.editionNumber,
    year: warWeek.year,
    startDate: warWeek.startDate,
    endDate: warWeek.endDate,
    storyTheme: warWeek.storyTheme,
    status: warWeek.status,
    mode: warWeek.mode,
    teamLabel: warWeek.teamLabel,
    leaderTitle: warWeek.leaderTitle,
    slackChannelUrl: warWeek.slackChannelUrl,
    standingsHidden: warWeek.standingsHidden,
  };
}
