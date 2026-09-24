import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import type { DBTx } from "@/db";
import type { WarWeekSettingsValues } from "@/lib/setup";

// Runs only against a local Postgres (CI's service or docker compose; see
// vitest.config.ts), never a hosted database.
const databaseUrl = process.env.DATABASE_URL ?? "";
const isLocalDatabase =
  process.env.DATABASE_DRIVER !== "neon" &&
  /@(localhost|127\.0\.0\.1)[:/]/.test(databaseUrl);

class Rollback extends Error {}

/** Runs `body` in a transaction that is always rolled back. */
async function inRolledBackTransaction(body: (tx: DBTx) => Promise<void>) {
  const { withTransaction } = await import("@/db");
  await withTransaction(async (tx) => {
    await body(tx);
    throw new Rollback();
  }).catch((error) => {
    if (!(error instanceof Rollback)) throw error;
  });
}

const actorEmail = "organizer@jahnelgroup.com";

const settings: WarWeekSettingsValues = {
  storyTheme: "Setup test",
  startDate: "2099-01-01",
  endDate: "2099-01-05",
  status: "live",
  mode: "teams",
  teamLabel: "House",
  leaderTitle: "Captain",
  slackChannelUrl: "https://example.slack.com/archives/x",
  wikiUrl: null,
  organizerEmails: [actorEmail],
  primaryColor: "#123456",
  primaryForegroundColor: "#ffffff",
  accentColor: "#000000",
  backgroundColor: "#ffffff",
  foregroundColor: "#000000",
  logoUrl: null,
  bannerUrl: null,
  fontPreset: "serif",
};

/** Two War Weeks; home has two Days, one with a Schedule Item. */
async function fixture(tx: DBTx) {
  const schema = await import("@/db/schema");
  const warWeek = async (n: number) => {
    const [row] = await tx
      .insert(schema.warWeek)
      .values({
        ...settings,
        edition: `s${n}`,
        editionNumber: 9200 + n,
        year: 9200 + n,
        organizerEmails: [actorEmail],
      })
      .returning({ id: schema.warWeek.id });
    return row.id;
  };
  const home = await warWeek(1);
  const other = await warWeek(2);
  const [busy] = await tx
    .insert(schema.day)
    .values({ warWeekId: home, date: "2099-01-02", dayTheme: "Busy" })
    .returning({ id: schema.day.id });
  await tx.insert(schema.scheduleItem).values({
    dayId: busy.id,
    startTime: "09:00",
    title: "Kickoff",
    category: "social",
  });
  const [quiet] = await tx
    .insert(schema.day)
    .values({ warWeekId: home, date: "2099-01-03", dayTheme: "Quiet" })
    .returning({ id: schema.day.id });
  const ctx = { warWeekId: home, actorEmail };
  return { schema, home, other, busyId: busy.id, quietId: quiet.id, ctx };
}

describe.skipIf(!isLocalDatabase)("updateWarWeekSettings", () => {
  it("saves the settings and Appearance Theme of only this War Week", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { updateWarWeekSettings } = await import("@/mutations/setup");
      const { schema, home, other, ctx } = await fixture(tx);

      const result = await updateWarWeekSettings(
        { ...settings, storyTheme: "Renamed", primaryColor: "#ff0000" },
        ctx,
        tx,
      );
      expect(result).toEqual({ ok: true });

      const rows = await tx.select().from(schema.warWeek);
      const byId = new Map(rows.map((r) => [r.id, r]));
      expect(byId.get(home)).toMatchObject({
        storyTheme: "Renamed",
        primaryColor: "#ff0000",
        fontPreset: "serif",
      });
      expect(byId.get(other)).toMatchObject({
        storyTheme: "Setup test",
        primaryColor: "#123456",
      });
    });
  });

  it("refuses free-for-all while the War Week has Teams", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { updateWarWeekSettings } = await import("@/mutations/setup");
      const { schema, home, ctx } = await fixture(tx);
      await tx
        .insert(schema.team)
        .values({ warWeekId: home, name: "Red", color: "#f00" });

      expect(
        await updateWarWeekSettings(
          { ...settings, mode: "free-for-all" },
          ctx,
          tx,
        ),
      ).toEqual({
        ok: false,
        error:
          "This War Week has 1 Team. Delete it before switching to free-for-all.",
      });
      const [row] = await tx
        .select({ mode: schema.warWeek.mode })
        .from(schema.warWeek)
        .where(eq(schema.warWeek.id, home));
      expect(row.mode).toBe("teams");
    });
  });

  it("refuses dates that leave a Day outside the War Week", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { updateWarWeekSettings } = await import("@/mutations/setup");
      const { ctx } = await fixture(tx);
      expect(
        await updateWarWeekSettings(
          { ...settings, startDate: "2099-01-03" },
          ctx,
          tx,
        ),
      ).toEqual({
        ok: false,
        error:
          "The Day on 2099-01-02 falls outside the new dates. Move or delete it first.",
      });
    });
  });
});

describe.skipIf(!isLocalDatabase)("Day mutations", () => {
  it("creates, edits and deletes a Day of this War Week", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createDay, updateDay, deleteDay } =
        await import("@/mutations/setup");
      const { getSetupDays } = await import("@/queries/setup");
      const { home, quietId, ctx } = await fixture(tx);

      expect(
        await createDay({ date: "2099-01-05", dayTheme: "Finale" }, ctx, tx),
      ).toEqual({ ok: true });
      expect(
        await updateDay(
          quietId,
          { date: "2099-01-04", dayTheme: "Moved" },
          ctx,
          tx,
        ),
      ).toEqual({ ok: true });

      const days = await getSetupDays({ id: home }, tx);
      expect(
        days.map(({ date, dayTheme, scheduleItemCount }) => ({
          date,
          dayTheme,
          scheduleItemCount,
        })),
      ).toEqual([
        { date: "2099-01-02", dayTheme: "Busy", scheduleItemCount: 1 },
        { date: "2099-01-04", dayTheme: "Moved", scheduleItemCount: 0 },
        { date: "2099-01-05", dayTheme: "Finale", scheduleItemCount: 0 },
      ]);

      expect(await deleteDay(quietId, ctx, tx)).toEqual({ ok: true });
      expect(await getSetupDays({ id: home }, tx)).toHaveLength(2);
    });
  });

  it("refuses a duplicate date, a date outside the War Week, and deleting a Day with Schedule Items", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createDay, updateDay, deleteDay } =
        await import("@/mutations/setup");
      const { busyId, quietId, ctx } = await fixture(tx);

      expect(
        await createDay({ date: "2099-01-02", dayTheme: "Again" }, ctx, tx),
      ).toEqual({ ok: false, error: "There's already a Day on 2099-01-02." });
      expect(
        await updateDay(
          quietId,
          { date: "2099-01-09", dayTheme: "Late" },
          ctx,
          tx,
        ),
      ).toEqual({
        ok: false,
        error:
          "A Day must fall within the War Week (2099-01-01 to 2099-01-05).",
      });
      expect(await deleteDay(busyId, ctx, tx)).toEqual({
        ok: false,
        error: "This Day has 1 Schedule Item. Delete or move it first.",
      });
    });
  });

  it("won't touch another War Week's Day", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { updateDay, deleteDay } = await import("@/mutations/setup");
      const { other, quietId } = await fixture(tx);
      const ctx = { warWeekId: other, actorEmail };

      expect(
        await updateDay(
          quietId,
          { date: "2099-01-04", dayTheme: "Hijack" },
          ctx,
          tx,
        ),
      ).toEqual({ ok: false, error: "That Day no longer exists." });
      expect(await deleteDay(quietId, ctx, tx)).toEqual({
        ok: false,
        error: "That Day no longer exists.",
      });
    });
  });
});
