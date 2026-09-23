import { and, eq, inArray, notInArray } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { WarWeek, day, warWeek } from "@/db/schema";
import { WarWeekSeed } from "@/seed/schema";

/**
 * Upserts a validated War Week seed (and its Days) in one transaction.
 *
 * `war_week` rows are upserted by `edition`. `standings_hidden` is
 * admin-owned state: it is only set from the seed on first insert and is
 * never overwritten on a reload of an existing War Week.
 *
 * Days are upserted on `(war_week_id, date)`; any existing Day whose date is
 * absent from the seed is deleted.
 */
export async function loadWarWeekSeed(
  seed: WarWeekSeed,
  dbOrTx: DBOrTx = db,
): Promise<WarWeek> {
  return dbOrTx.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(warWeek)
      .where(eq(warWeek.edition, seed.edition))
      .limit(1);

    const values = {
      edition: seed.edition,
      editionNumber: seed.editionNumber,
      year: seed.year,
      startDate: seed.startDate,
      endDate: seed.endDate,
      storyTheme: seed.storyTheme,
      status: seed.status,
      mode: seed.mode,
      teamLabel: seed.teamLabel,
      leaderTitle: seed.leaderTitle,
      slackChannelUrl: seed.slackChannelUrl,
      primaryColor: seed.primary,
      primaryForegroundColor: seed.primaryForeground,
      accentColor: seed.accent,
      backgroundColor: seed.background,
      foregroundColor: seed.foreground,
      logoUrl: seed.logoUrl ?? null,
      bannerUrl: seed.bannerUrl ?? null,
      fontPreset: seed.fontPreset,
      wikiUrl: seed.wikiUrl ?? null,
      organizerEmails: seed.organizerEmails,
      winner: seed.winner ?? null,
      highlights: seed.highlights,
      updatedAt: new Date(),
    };

    let warWeekRow: WarWeek;
    if (existing) {
      const [updated] = await tx
        .update(warWeek)
        .set(values)
        .where(eq(warWeek.id, existing.id))
        .returning();
      warWeekRow = updated;
    } else {
      const [inserted] = await tx
        .insert(warWeek)
        .values({ ...values, standingsHidden: seed.standingsHidden })
        .returning();
      warWeekRow = inserted;
    }

    const seedDates = seed.days.map((d) => d.date);

    if (seedDates.length > 0) {
      await tx
        .delete(day)
        .where(
          and(
            eq(day.warWeekId, warWeekRow.id),
            notInArray(day.date, seedDates),
          ),
        );
    } else {
      await tx.delete(day).where(eq(day.warWeekId, warWeekRow.id));
    }

    const existingDays = seedDates.length
      ? await tx
          .select()
          .from(day)
          .where(
            and(eq(day.warWeekId, warWeekRow.id), inArray(day.date, seedDates)),
          )
      : [];
    const existingByDate = new Map(existingDays.map((d) => [d.date, d]));

    for (const daySeed of seed.days) {
      const match = existingByDate.get(daySeed.date);
      if (match) {
        await tx
          .update(day)
          .set({ dayTheme: daySeed.dayTheme, updatedAt: new Date() })
          .where(eq(day.id, match.id));
      } else {
        await tx.insert(day).values({
          warWeekId: warWeekRow.id,
          date: daySeed.date,
          dayTheme: daySeed.dayTheme,
        });
      }
    }

    return warWeekRow;
  });
}
