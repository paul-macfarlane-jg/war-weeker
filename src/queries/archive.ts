import { asc, eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { WarWeek, team, warWeek } from "@/db/schema";
import { type ArchiveDetail, isArchived, selectArchive } from "@/lib/archive";
import { namedAward } from "@/lib/awards";
import { getAwards } from "@/queries/awards";

/** The Archive list: every archived War Week, newest first. */
export async function listArchive(dbOrTx: DBOrTx = db): Promise<WarWeek[]> {
  return selectArchive(await dbOrTx.select().from(warWeek));
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
    getAwards(pastWarWeek, dbOrTx),
  ]);

  return {
    warWeek: pastWarWeek,
    teams,
    awards: awards.map(namedAward),
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
    .where(eq(warWeek.year, year))
    .limit(1);
  return row && isArchived(row) ? getArchiveDetail(row, dbOrTx) : undefined;
}
