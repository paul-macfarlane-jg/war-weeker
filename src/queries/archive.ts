import { and, asc, eq, inArray } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import {
  WarWeek,
  award,
  awardParticipant,
  participant,
  team,
  warWeek,
} from "@/db/schema";
import { type ArchiveDetail, selectArchive } from "@/lib/archive";

/** The Archive list: every `complete` War Week, newest first. */
export async function listArchive(dbOrTx: DBOrTx = db): Promise<WarWeek[]> {
  const rows = await dbOrTx
    .select()
    .from(warWeek)
    .where(eq(warWeek.status, "complete"));
  return selectArchive(rows);
}

/** A past War Week's Teams and Awards (with recipient names). */
export async function getArchiveDetail(
  pastWarWeek: WarWeek,
  dbOrTx: DBOrTx = db,
): Promise<ArchiveDetail> {
  const [teams, awards] = await Promise.all([
    dbOrTx
      .select({ name: team.name, color: team.color })
      .from(team)
      .where(eq(team.warWeekId, pastWarWeek.id))
      .orderBy(asc(team.name)),
    dbOrTx
      .select({
        id: award.id,
        name: award.name,
        description: award.description,
        team: team.name,
      })
      .from(award)
      .leftJoin(team, eq(award.teamId, team.id))
      .where(eq(award.warWeekId, pastWarWeek.id))
      .orderBy(asc(award.name)),
  ]);

  const recipients =
    awards.length === 0
      ? []
      : await dbOrTx
          .select({
            awardId: awardParticipant.awardId,
            displayName: participant.displayName,
          })
          .from(awardParticipant)
          .innerJoin(
            participant,
            eq(awardParticipant.participantId, participant.id),
          )
          .where(
            inArray(
              awardParticipant.awardId,
              awards.map((a) => a.id),
            ),
          )
          .orderBy(asc(participant.displayName));

  return {
    warWeek: pastWarWeek,
    teams,
    awards: awards.map(({ id, ...rest }) => ({
      ...rest,
      participants: recipients
        .filter((r) => r.awardId === id)
        .map((r) => r.displayName),
    })),
  };
}

/** A past War Week by year, or `undefined` when the year isn't archived. */
export async function getArchiveDetailByYear(
  year: number,
  dbOrTx: DBOrTx = db,
): Promise<ArchiveDetail | undefined> {
  const [row] = await dbOrTx
    .select()
    .from(warWeek)
    .where(and(eq(warWeek.year, year), eq(warWeek.status, "complete")))
    .limit(1);
  return row ? getArchiveDetail(row, dbOrTx) : undefined;
}
