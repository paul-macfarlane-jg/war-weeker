import { describe, expect, it } from "vitest";

import type { DBTx } from "@/db";

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

/** Two War Weeks, both with standings hidden. */
async function fixture(tx: DBTx) {
  const schema = await import("@/db/schema");
  const rows = await tx
    .insert(schema.warWeek)
    .values(
      [1, 2].map((n) => ({
        edition: `t${n}`,
        editionNumber: 9000 + n,
        year: 9000 + n,
        startDate: "2099-01-01",
        endDate: "2099-01-05",
        storyTheme: "Mutation test",
        status: "live" as const,
        mode: "teams" as const,
        teamLabel: "Team",
        leaderTitle: "Captain",
        slackChannelUrl: "https://example.slack.com/archives/x",
        primaryColor: "#000",
        primaryForegroundColor: "#fff",
        accentColor: "#000",
        backgroundColor: "#fff",
        foregroundColor: "#000",
        fontPreset: "sans" as const,
        standingsHidden: true,
      })),
    )
    .returning({ id: schema.warWeek.id });
  const hidden = async () =>
    Object.fromEntries(
      (
        await tx
          .select({
            id: schema.warWeek.id,
            hidden: schema.warWeek.standingsHidden,
          })
          .from(schema.warWeek)
      ).map((row) => [row.id, row.hidden]),
    );
  return { home: rows[0].id, other: rows[1].id, hidden };
}

const actorEmail = "organizer@jahnelgroup.com";

describe.skipIf(!isLocalDatabase)("setStandingsHidden", () => {
  it("reveals and hides only the context's War Week", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { setStandingsHidden } = await import("@/mutations/war-weeks");
      const { home, other, hidden } = await fixture(tx);
      const ctx = { warWeekId: home, actorEmail };

      expect(await setStandingsHidden(false, ctx, tx)).toEqual({ ok: true });
      expect(await hidden()).toMatchObject({ [home]: false, [other]: true });

      expect(await setStandingsHidden(true, ctx, tx)).toEqual({ ok: true });
      expect(await hidden()).toMatchObject({ [home]: true, [other]: true });
    });
  });

  it("refuses a War Week that doesn't exist", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { setStandingsHidden } = await import("@/mutations/war-weeks");
      const result = await setStandingsHidden(
        false,
        { warWeekId: "00000000-0000-4000-8000-000000000000", actorEmail },
        tx,
      );
      expect(result).toEqual({
        ok: false,
        error: "That War Week no longer exists.",
      });
    });
  });
});
