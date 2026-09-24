import { eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { WarWeek, warWeek } from "@/db/schema";

/**
 * Picks the War Week to show as "current" from a list, never using the
 * clock: a `live` War Week wins outright; otherwise the next `upcoming` one
 * (earliest `startDate`, ties to the lowest `editionNumber`); otherwise the
 * most recent `complete` one (latest `startDate`, ties to the highest
 * `editionNumber`). Returns `undefined` for an empty list or a list with no
 * `live`, `upcoming`, or `complete` War Week.
 */
export function selectCurrentWarWeek(warWeeks: WarWeek[]): WarWeek | undefined {
  const live = warWeeks.filter((w) => w.status === "live");
  if (live.length > 0) {
    return latestByStartDate(live);
  }

  const upcoming = warWeeks.filter((w) => w.status === "upcoming");
  if (upcoming.length > 0) {
    return earliestByStartDate(upcoming);
  }

  const complete = warWeeks.filter((w) => w.status === "complete");
  if (complete.length > 0) {
    return latestByStartDate(complete);
  }

  return undefined;
}

function earliestByStartDate(warWeeks: WarWeek[]): WarWeek {
  return warWeeks.reduce((earliest, candidate) => {
    if (candidate.startDate < earliest.startDate) return candidate;
    if (candidate.startDate > earliest.startDate) return earliest;
    return candidate.editionNumber < earliest.editionNumber
      ? candidate
      : earliest;
  });
}

function latestByStartDate(warWeeks: WarWeek[]): WarWeek {
  return warWeeks.reduce((latest, candidate) => {
    if (candidate.startDate > latest.startDate) return candidate;
    if (candidate.startDate < latest.startDate) return latest;
    return candidate.editionNumber > latest.editionNumber ? candidate : latest;
  });
}

export async function getCurrentWarWeek(
  dbOrTx: DBOrTx = db,
): Promise<WarWeek | undefined> {
  const warWeeks = await dbOrTx.select().from(warWeek);
  return selectCurrentWarWeek(warWeeks);
}

export async function getWarWeekByEdition(
  edition: string,
  dbOrTx: DBOrTx = db,
): Promise<WarWeek | undefined> {
  const [row] = await dbOrTx
    .select()
    .from(warWeek)
    .where(eq(warWeek.edition, edition.toLowerCase()))
    .limit(1);
  return row;
}
