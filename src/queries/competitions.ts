import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { DBOrTx, db } from "@/db";
import {
  WarWeek,
  competition,
  participant,
  pointsEntry,
  team,
} from "@/db/schema";
import {
  type CompetitionLedger,
  buildCompetitionLedger,
  groupCompetitions,
  isCompetitionId,
} from "@/lib/competitions";

const competitionColumns = {
  id: competition.id,
  name: competition.name,
  description: competition.description,
  maxPoints: competition.maxPoints,
  scoring: competition.scoring,
  countsTowardTeam: competition.countsTowardTeam,
  competitionGroup: competition.competitionGroup,
};

/** Loads a War Week's Competitions, grouped by `groupCompetitions`. */
export async function getCompetitions(warWeekId: string, dbOrTx: DBOrTx = db) {
  const rows = await dbOrTx
    .select(competitionColumns)
    .from(competition)
    .where(eq(competition.warWeekId, warWeekId));
  return groupCompetitions(rows);
}

export type CompetitionListItem = Awaited<
  ReturnType<typeof getCompetitions>
>["ungrouped"][number];

const participantTeam = alias(team, "participant_team");

/**
 * Loads one Competition of a War Week and its ledger. Returns `undefined`
 * when `id` is not a Competition of this War Week. While standings are
 * hidden it skips the Points Entries query.
 */
export async function getCompetitionWithLedger(
  warWeek: Pick<WarWeek, "id" | "standingsHidden">,
  id: string,
  dbOrTx: DBOrTx = db,
): Promise<
  { competition: CompetitionListItem; ledger: CompetitionLedger } | undefined
> {
  if (!isCompetitionId(id)) return undefined;

  const [found] = await dbOrTx
    .select(competitionColumns)
    .from(competition)
    .where(and(eq(competition.id, id), eq(competition.warWeekId, warWeek.id)))
    .limit(1);
  if (!found) return undefined;

  if (warWeek.standingsHidden) {
    return {
      competition: found,
      ledger: buildCompetitionLedger({ standingsHidden: true, rows: [] }),
    };
  }

  const rows = await dbOrTx
    .select({
      id: pointsEntry.id,
      points: pointsEntry.points,
      note: pointsEntry.note,
      enteredAt: pointsEntry.enteredAt,
      teamName: team.name,
      teamColor: team.color,
      participantName: participant.displayName,
      participantTeamName: participantTeam.name,
      participantTeamColor: participantTeam.color,
    })
    .from(pointsEntry)
    .leftJoin(team, eq(team.id, pointsEntry.teamId))
    .leftJoin(participant, eq(participant.id, pointsEntry.participantId))
    .leftJoin(participantTeam, eq(participantTeam.id, participant.teamId))
    .where(eq(pointsEntry.competitionId, found.id));

  return {
    competition: found,
    ledger: buildCompetitionLedger({
      standingsHidden: false,
      rows: rows.map((row) => ({
        id: row.id,
        points: row.points,
        note: row.note,
        enteredAt: row.enteredAt,
        team:
          row.teamName !== null && row.teamColor !== null
            ? { name: row.teamName, color: row.teamColor }
            : null,
        participant:
          row.participantName !== null
            ? {
                displayName: row.participantName,
                team:
                  row.participantTeamName !== null &&
                  row.participantTeamColor !== null
                    ? {
                        name: row.participantTeamName,
                        color: row.participantTeamColor,
                      }
                    : null,
              }
            : null,
      })),
    }),
  };
}
