import { asc, count, eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import {
  type Competition,
  type Participant,
  type Team,
  type WarWeek,
  award,
  awardParticipant,
  competition,
  day,
  participant,
  pointsEntry,
  scheduleItem,
  team,
} from "@/db/schema";

/** A Day as the setup page lists it. */
export type SetupDay = {
  id: string;
  date: string;
  dayTheme: string;
  scheduleItemCount: number;
};

/** A War Week's Days in date order, each with its Schedule Item count. */
export async function getSetupDays(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<SetupDay[]> {
  return dbOrTx
    .select({
      id: day.id,
      date: day.date,
      dayTheme: day.dayTheme,
      scheduleItemCount: count(scheduleItem.id),
    })
    .from(day)
    .leftJoin(scheduleItem, eq(scheduleItem.dayId, day.id))
    .where(eq(day.warWeekId, warWeek.id))
    .groupBy(day.id)
    .orderBy(asc(day.date));
}

/** A Team as the setup page lists it, with what would block deleting it. */
export type SetupTeam = Pick<Team, "id" | "name" | "color" | "logoUrl"> & {
  participantCount: number;
  pointsEntryCount: number;
  awardCount: number;
};

/** A War Week's Teams by name. */
export async function getSetupTeams(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<SetupTeam[]> {
  return dbOrTx
    .select({
      id: team.id,
      name: team.name,
      color: team.color,
      logoUrl: team.logoUrl,
      participantCount: dbOrTx.$count(
        participant,
        eq(participant.teamId, team.id),
      ),
      pointsEntryCount: dbOrTx.$count(
        pointsEntry,
        eq(pointsEntry.teamId, team.id),
      ),
      awardCount: dbOrTx.$count(award, eq(award.teamId, team.id)),
    })
    .from(team)
    .where(eq(team.warWeekId, warWeek.id))
    .orderBy(asc(team.name));
}

/** A Participant as the roster table lists it. */
export type SetupParticipant = Pick<
  Participant,
  "id" | "displayName" | "companyTag" | "email" | "teamId" | "isLeader"
> & { pointsEntryCount: number; awardCount: number };

/** A War Week's Participants by display name. */
export async function getSetupParticipants(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<SetupParticipant[]> {
  return dbOrTx
    .select({
      id: participant.id,
      displayName: participant.displayName,
      companyTag: participant.companyTag,
      email: participant.email,
      teamId: participant.teamId,
      isLeader: participant.isLeader,
      pointsEntryCount: dbOrTx.$count(
        pointsEntry,
        eq(pointsEntry.participantId, participant.id),
      ),
      awardCount: dbOrTx.$count(
        awardParticipant,
        eq(awardParticipant.participantId, participant.id),
      ),
    })
    .from(participant)
    .where(eq(participant.warWeekId, warWeek.id))
    .orderBy(asc(participant.displayName));
}

/** A Competition as the setup page lists it. */
export type SetupCompetition = Pick<
  Competition,
  | "id"
  | "name"
  | "description"
  | "scoring"
  | "maxPoints"
  | "placementPoints"
  | "countsTowardTeam"
  | "competitionGroup"
> & { pointsEntryCount: number; scheduleItemCount: number };

/** A War Week's Competitions by name. */
export async function getSetupCompetitions(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<SetupCompetition[]> {
  return dbOrTx
    .select({
      id: competition.id,
      name: competition.name,
      description: competition.description,
      scoring: competition.scoring,
      maxPoints: competition.maxPoints,
      placementPoints: competition.placementPoints,
      countsTowardTeam: competition.countsTowardTeam,
      competitionGroup: competition.competitionGroup,
      pointsEntryCount: dbOrTx.$count(
        pointsEntry,
        eq(pointsEntry.competitionId, competition.id),
      ),
      scheduleItemCount: dbOrTx.$count(
        scheduleItem,
        eq(scheduleItem.competitionId, competition.id),
      ),
    })
    .from(competition)
    .where(eq(competition.warWeekId, warWeek.id))
    .orderBy(asc(competition.name));
}
