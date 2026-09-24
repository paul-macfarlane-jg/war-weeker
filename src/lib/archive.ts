import type { WarWeek } from "@/db/schema";

export type ArchiveTeam = { name: string; color: string };

export type ArchiveAward = {
  name: string;
  description: string | null;
  team: string | null;
  participants: string[];
};

/** A past War Week with the Teams and Awards the Archive shows. */
export type ArchiveDetail = {
  warWeek: WarWeek;
  teams: ArchiveTeam[];
  awards: ArchiveAward[];
};

/** The Archive: `complete` War Weeks only, newest year first. */
export function selectArchive(warWeeks: WarWeek[]): WarWeek[] {
  return warWeeks
    .filter((w) => w.status === "complete")
    .sort((a, b) => b.year - a.year);
}

/**
 * A sparse early year: no stored winner, Teams or Awards, so its card is
 * little more than the link to the original wiki page.
 */
export function isLinkOnly(detail: ArchiveDetail): boolean {
  return (
    !detail.warWeek.winner &&
    detail.teams.length === 0 &&
    detail.awards.length === 0
  );
}

/** "Slytherin · Dom Favata, Lucas Fernandes": Team first, then Participants. */
export function awardRecipients(award: ArchiveAward): string {
  const participants = award.participants.join(", ");
  return [award.team, participants].filter(Boolean).join(" · ");
}
