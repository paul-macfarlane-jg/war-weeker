import { eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import {
  WarWeek,
  competition,
  participant,
  pointsEntry,
  team,
} from "@/db/schema";
import { Standings, computeStandings } from "@/lib/standings";

/**
 * Loads a War Week's Standings, the same rows for Participants, Organizers,
 * MCP and the Finale.
 */
export async function getStandings(
  warWeek: Pick<WarWeek, "id" | "mode">,
  dbOrTx: DBOrTx = db,
): Promise<Standings> {
  const [teams, participants, competitions, pointsEntries] = await Promise.all([
    dbOrTx
      .select({ id: team.id, name: team.name, color: team.color })
      .from(team)
      .where(eq(team.warWeekId, warWeek.id)),
    dbOrTx
      .select({
        id: participant.id,
        displayName: participant.displayName,
        teamId: participant.teamId,
      })
      .from(participant)
      .where(eq(participant.warWeekId, warWeek.id)),
    dbOrTx
      .select({
        id: competition.id,
        scoring: competition.scoring,
        countsTowardTeam: competition.countsTowardTeam,
      })
      .from(competition)
      .where(eq(competition.warWeekId, warWeek.id)),
    dbOrTx
      .select({
        competitionId: pointsEntry.competitionId,
        teamId: pointsEntry.teamId,
        participantId: pointsEntry.participantId,
        points: pointsEntry.points,
      })
      .from(pointsEntry)
      .innerJoin(competition, eq(competition.id, pointsEntry.competitionId))
      .where(eq(competition.warWeekId, warWeek.id)),
  ]);

  return computeStandings({
    mode: warWeek.mode,
    teams,
    participants,
    competitions,
    pointsEntries,
  });
}
