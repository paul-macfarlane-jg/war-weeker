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
 * Loads a War Week's Standings. While standings are hidden it skips the
 * queries and lets `computeStandings` return its hidden result.
 */
export async function getStandings(
  warWeek: Pick<WarWeek, "id" | "mode" | "standingsHidden">,
  dbOrTx: DBOrTx = db,
): Promise<Standings> {
  if (warWeek.standingsHidden) {
    return computeStandings({
      mode: warWeek.mode,
      standingsHidden: true,
      teams: [],
      participants: [],
      competitions: [],
      pointsEntries: [],
    });
  }
  return loadStandings(warWeek, dbOrTx);
}

/**
 * The real Standings for Organizers in admin, even while they're hidden
 * from Participants.
 */
export async function getOrganizerStandings(
  warWeek: Pick<WarWeek, "id" | "mode">,
  dbOrTx: DBOrTx = db,
) {
  return loadStandings(warWeek, dbOrTx);
}

type VisibleStandings = Extract<Standings, { hidden: false }>;

async function loadStandings(
  warWeek: Pick<WarWeek, "id" | "mode">,
  dbOrTx: DBOrTx,
): Promise<VisibleStandings> {
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

  // Not hidden, so `computeStandings` returns the visible shape.
  return computeStandings({
    mode: warWeek.mode,
    standingsHidden: false,
    teams,
    participants,
    competitions,
    pointsEntries,
  }) as VisibleStandings;
}
