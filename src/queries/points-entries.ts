import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { DBOrTx, db } from "@/db";
import {
  WarWeek,
  competition,
  participant,
  pointsEntry,
  team,
  warWeek as warWeekTable,
} from "@/db/schema";
import { isCompetitionId } from "@/lib/competitions";

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export type PointsEntryFormCompetition = {
  id: string;
  name: string;
  scoring: "team" | "individual";
  maxPoints: number | null;
};

export type PointsEntryFormTarget = {
  id: string;
  name: string;
  /** A Participant's Team name; null for Teams and unassigned Participants. */
  team: string | null;
};

export type PointsEntryFormOptions = {
  competitions: PointsEntryFormCompetition[];
  teams: PointsEntryFormTarget[];
  participants: PointsEntryFormTarget[];
};

const participantTeam = alias(team, "participant_team");

/**
 * Everything the Points Entry form offers: every Competition of the War Week
 * (scheduled or not) and its Teams and Participants, each by name.
 */
export async function getPointsEntryFormOptions(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<PointsEntryFormOptions> {
  const [competitions, teams, participants] = await Promise.all([
    dbOrTx
      .select({
        id: competition.id,
        name: competition.name,
        scoring: competition.scoring,
        maxPoints: competition.maxPoints,
      })
      .from(competition)
      .where(eq(competition.warWeekId, warWeek.id))
      .orderBy(asc(competition.name)),
    dbOrTx
      .select({ id: team.id, name: team.name })
      .from(team)
      .where(eq(team.warWeekId, warWeek.id))
      .orderBy(asc(team.name)),
    dbOrTx
      .select({
        id: participant.id,
        name: participant.displayName,
        team: participantTeam.name,
      })
      .from(participant)
      .leftJoin(participantTeam, eq(participantTeam.id, participant.teamId))
      .where(eq(participant.warWeekId, warWeek.id))
      .orderBy(asc(participant.displayName)),
  ]);

  return {
    competitions,
    teams: teams.map((t) => ({ ...t, team: null })),
    participants,
  };
}

export type AdminLedgerEntry = {
  id: string;
  competition: string;
  target: string;
  points: number;
  note: string | null;
  enteredByEmail: string;
  enteredAt: Date;
  updatedAt: Date;
  /** Changed since it was saved (a seeded entry's `enteredAt` is historical). */
  edited: boolean;
};

/** Every Points Entry of a War Week for the admin ledger, newest first. */
export async function getAdminLedger(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<AdminLedgerEntry[]> {
  const rows = await dbOrTx
    .select({
      id: pointsEntry.id,
      competition: competition.name,
      teamName: team.name,
      participantName: participant.displayName,
      points: pointsEntry.points,
      note: pointsEntry.note,
      enteredByEmail: pointsEntry.enteredByEmail,
      enteredAt: pointsEntry.enteredAt,
      createdAt: pointsEntry.createdAt,
      updatedAt: pointsEntry.updatedAt,
    })
    .from(pointsEntry)
    .innerJoin(competition, eq(competition.id, pointsEntry.competitionId))
    .leftJoin(team, eq(team.id, pointsEntry.teamId))
    .leftJoin(participant, eq(participant.id, pointsEntry.participantId))
    .where(eq(competition.warWeekId, warWeek.id))
    .orderBy(desc(pointsEntry.enteredAt), asc(pointsEntry.id));

  return rows.map(({ teamName, participantName, createdAt, ...row }) => ({
    ...row,
    target: participantName ?? teamName ?? "Unknown",
    edited: row.updatedAt.getTime() - createdAt.getTime() > 1000,
  }));
}

/** One Points Entry of a War Week, for the edit form. */
export async function getPointsEntryForEdit(
  warWeek: Pick<WarWeek, "id">,
  id: string,
  dbOrTx: DBOrTx = db,
) {
  if (!isUuid(id)) return undefined;
  const [found] = await dbOrTx
    .select({
      id: pointsEntry.id,
      competitionId: pointsEntry.competitionId,
      teamId: pointsEntry.teamId,
      participantId: pointsEntry.participantId,
      points: pointsEntry.points,
      note: pointsEntry.note,
      enteredByEmail: pointsEntry.enteredByEmail,
      enteredAt: pointsEntry.enteredAt,
    })
    .from(pointsEntry)
    .innerJoin(competition, eq(competition.id, pointsEntry.competitionId))
    .where(and(eq(pointsEntry.id, id), eq(competition.warWeekId, warWeek.id)))
    .limit(1);
  return found;
}

const organizerWarWeekColumns = {
  id: warWeekTable.id,
  edition: warWeekTable.edition,
  organizerEmails: warWeekTable.organizerEmails,
};

/** A Competition with the War Week it belongs to, for Organizer checks. */
export async function getCompetitionWithWarWeek(
  id: string,
  dbOrTx: DBOrTx = db,
) {
  if (!isCompetitionId(id)) return undefined;
  const [found] = await dbOrTx
    .select({
      competition: { id: competition.id, scoring: competition.scoring },
      warWeek: organizerWarWeekColumns,
    })
    .from(competition)
    .innerJoin(warWeekTable, eq(warWeekTable.id, competition.warWeekId))
    .where(eq(competition.id, id))
    .limit(1);
  return found;
}

/** A Points Entry's War Week, for Organizer checks on edit and delete. */
export async function getPointsEntryWarWeek(id: string, dbOrTx: DBOrTx = db) {
  if (!isUuid(id)) return undefined;
  const [found] = await dbOrTx
    .select(organizerWarWeekColumns)
    .from(pointsEntry)
    .innerJoin(competition, eq(competition.id, pointsEntry.competitionId))
    .innerJoin(warWeekTable, eq(warWeekTable.id, competition.warWeekId))
    .where(eq(pointsEntry.id, id))
    .limit(1);
  return found;
}

/** The War Week's roster ids that match `targetId` (at most one of each). */
export async function getTargetRoster(
  warWeek: Pick<WarWeek, "id">,
  targetId: string,
  dbOrTx: DBOrTx = db,
) {
  const [teams, participants] = await Promise.all([
    dbOrTx
      .select({ id: team.id })
      .from(team)
      .where(and(eq(team.id, targetId), eq(team.warWeekId, warWeek.id))),
    dbOrTx
      .select({ id: participant.id })
      .from(participant)
      .where(
        and(
          eq(participant.id, targetId),
          eq(participant.warWeekId, warWeek.id),
        ),
      ),
  ]);
  return {
    teamIds: new Set(teams.map((t) => t.id)),
    participantIds: new Set(participants.map((p) => p.id)),
  };
}
