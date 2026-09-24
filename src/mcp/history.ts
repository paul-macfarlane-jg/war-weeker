import type { WarWeek } from "@/db/schema";
import type { ArchiveAward, ArchiveDetail, ArchiveTeam } from "@/lib/archive";

export type HistoryListResult = {
  warWeeks: {
    edition: string;
    year: number;
    startDate: string;
    endDate: string;
    storyTheme: string;
    winner: string | null;
    wikiUrl: string | null;
  }[];
};

export type HistoryResult =
  | {
      found: true;
      edition: string;
      editionNumber: number;
      year: number;
      startDate: string;
      endDate: string;
      storyTheme: string;
      mode: WarWeek["mode"];
      teamLabel: string;
      winner: string | null;
      teams: ArchiveTeam[];
      awards: ArchiveAward[];
      highlights: string[];
      wikiUrl: string | null;
    }
  | { found: false; year: number; message: string };

/** Payload for `list_history`: the Archive in the order given. */
export function toHistoryListResult(warWeeks: WarWeek[]): HistoryListResult {
  return {
    warWeeks: warWeeks.map((w) => ({
      edition: w.edition,
      year: w.year,
      startDate: w.startDate,
      endDate: w.endDate,
      storyTheme: w.storyTheme,
      winner: w.winner,
      wikiUrl: w.wikiUrl,
    })),
  };
}

/**
 * Payload for `get_history(year)`. The winner is the stored text, never
 * computed from Points Entries.
 */
export function toHistoryResult(
  year: number,
  detail: ArchiveDetail | undefined,
): HistoryResult {
  if (!detail) {
    return {
      found: false,
      year,
      message: `No past War Week found for ${year}. Call list_history for the years in the Archive.`,
    };
  }

  const { warWeek, teams, awards } = detail;
  return {
    found: true,
    edition: warWeek.edition,
    editionNumber: warWeek.editionNumber,
    year: warWeek.year,
    startDate: warWeek.startDate,
    endDate: warWeek.endDate,
    storyTheme: warWeek.storyTheme,
    mode: warWeek.mode,
    teamLabel: warWeek.teamLabel,
    winner: warWeek.winner,
    teams,
    awards,
    highlights: warWeek.highlights,
    wikiUrl: warWeek.wikiUrl,
  };
}
