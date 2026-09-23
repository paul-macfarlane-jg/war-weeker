import { z } from "zod";

import type { Competition, PointsEntry, Team } from "@/db/schema";
import { formatPoints } from "@/lib/points";

export type CompetitionListItem = Pick<
  Competition,
  | "id"
  | "name"
  | "description"
  | "maxPoints"
  | "scoring"
  | "countsTowardTeam"
  | "competitionGroup"
>;

export type CompetitionGroups<T> = {
  groups: { name: string; competitions: T[] }[];
  ungrouped: T[];
};

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name);

/**
 * Groups Competitions by Competition Group for the Competitions list.
 * Groups and the Competitions within each are ordered by name; Competitions
 * with no group are returned separately.
 */
export function groupCompetitions<
  T extends Pick<Competition, "name" | "competitionGroup">,
>(competitions: T[]): CompetitionGroups<T> {
  const groups = new Map<string, T[]>();
  const ungrouped: T[] = [];
  for (const competition of competitions) {
    const group = competition.competitionGroup;
    if (group === null) {
      ungrouped.push(competition);
    } else {
      groups.set(group, [...(groups.get(group) ?? []), competition]);
    }
  }

  return {
    groups: [...groups]
      .map(([name, inGroup]) => ({ name, competitions: inGroup.sort(byName) }))
      .sort(byName),
    ungrouped: ungrouped.sort(byName),
  };
}

/** "Team", "Individual", or "Individual · counts toward <Team Label>". */
export function describeScoring(
  competition: Pick<Competition, "scoring" | "countsTowardTeam">,
  teamLabel: string,
): string {
  if (competition.scoring === "team") return "Team";
  return competition.countsTowardTeam
    ? `Individual · counts toward ${teamLabel}`
    : "Individual";
}

export function formatMaxPoints(maxPoints: number | null): string {
  if (maxPoints === null) return "No max";
  return `Max ${formatPoints(maxPoints)} ${maxPoints === 1 ? "pt" : "pts"}`;
}

const competitionId = z.uuid();

/** Whether a URL segment is shaped like a Competition id (a UUID). */
export function isCompetitionId(id: string): boolean {
  return competitionId.safeParse(id).success;
}

type LedgerTeam = Pick<Team, "name" | "color">;

export type LedgerRow = Pick<
  PointsEntry,
  "id" | "points" | "note" | "enteredAt"
> & {
  team: LedgerTeam | null;
  participant: { displayName: string; team: LedgerTeam | null } | null;
};

export type LedgerEntry = {
  id: string;
  /** `team` is the Participant's Team name; null for a Team target. */
  target: { name: string; color: string | null; team: string | null };
  points: number;
  note: string | null;
};

export type CompetitionLedger =
  { hidden: true } | { hidden: false; entries: LedgerEntry[] };

/**
 * The Points Entries behind one Competition, oldest first.
 *
 * While standings are hidden the ledger is hidden too: its entries would let
 * anyone add up the totals the Reveal is meant to keep secret.
 */
export function buildCompetitionLedger({
  standingsHidden,
  rows,
}: {
  standingsHidden: boolean;
  rows: LedgerRow[];
}): CompetitionLedger {
  if (standingsHidden) return { hidden: true };

  const entries = [...rows]
    .sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime())
    .map(({ id, points, note, team, participant }) => ({
      id,
      target: participant
        ? {
            name: participant.displayName,
            color: participant.team?.color ?? null,
            team: participant.team?.name ?? null,
          }
        : {
            name: team?.name ?? "Unknown",
            color: team?.color ?? null,
            team: null,
          },
      points,
      note,
    }));

  return { hidden: false, entries };
}
