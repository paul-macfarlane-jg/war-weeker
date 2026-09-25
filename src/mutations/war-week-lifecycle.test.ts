import { describe, expect, it } from "vitest";

import type { DBTx } from "@/db";
import type { NextWarWeekValues } from "@/lib/war-week-lifecycle";

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

const actorEmail = "creator@jahnelgroup.com";

function warWeekValues(
  n: number,
  status: "upcoming" | "live" | "complete",
  overrides: Record<string, unknown> = {},
) {
  return {
    edition: `t${"i".repeat(n)}`,
    editionNumber: 9300 + n,
    year: 9300 + n,
    startDate: "2099-01-01",
    endDate: "2099-01-05",
    storyTheme: `Lifecycle ${n}`,
    status,
    mode: "teams" as const,
    teamLabel: "House",
    leaderTitle: "Head of House",
    slackChannelUrl: "https://example.slack.com/archives/lifecycle",
    primaryColor: "#123456",
    primaryForegroundColor: "#fefefe",
    accentColor: "#abcdef",
    backgroundColor: "#101010",
    foregroundColor: "#efefef",
    fontPreset: "serif" as const,
    logoUrl: "/themes/t/logo.svg",
    bannerUrl: "/themes/t/banner.svg",
    wikiUrl: "https://example.com/wiki",
    organizerEmails: ["lead@jahnelgroup.com", "other@jahnelgroup.com"],
    ...overrides,
  };
}

/**
 * A live War Week with a Team, a Day, a Competition, an FAQ Item and a
 * Points Entry. Whatever the database already has live is set complete
 * first (rolled back with the test), so the one-live index doesn't bite.
 */
async function fixture(tx: DBTx) {
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  await tx
    .update(schema.warWeek)
    .set({ status: "complete" })
    .where(eq(schema.warWeek.status, "live"));
  const [live] = await tx
    .insert(schema.warWeek)
    .values(warWeekValues(1, "live"))
    .returning();
  const [red] = await tx
    .insert(schema.team)
    .values({ warWeekId: live.id, name: "Red", color: "#f00" })
    .returning();
  await tx
    .insert(schema.day)
    .values({ warWeekId: live.id, date: "2099-01-02", dayTheme: "Kickoff" });
  const [chess] = await tx
    .insert(schema.competition)
    .values({
      warWeekId: live.id,
      name: "Chess",
      description: "1v1",
      maxPoints: 10,
      placementPoints: [10, 5],
      scoring: "team",
      competitionGroup: "Board games",
    })
    .returning();
  await tx.insert(schema.pointsEntry).values({
    competitionId: chess.id,
    teamId: red.id,
    points: 10,
    enteredByEmail: "lead@jahnelgroup.com",
  });
  await tx.insert(schema.faqItem).values({
    warWeekId: live.id,
    question: "Where?",
    answer: { type: "doc", content: [] },
    sortOrder: 0,
  });
  const byId = async (id: string) =>
    (
      await tx.select().from(schema.warWeek).where(eq(schema.warWeek.id, id))
    )[0];
  return { live, chess, byId, schema };
}

function next(overrides: Partial<NextWarWeekValues> = {}): NextWarWeekValues {
  return {
    edition: "tii",
    editionNumber: 9302,
    year: 9302,
    startDate: "2100-01-01",
    endDate: "2100-01-05",
    storyTheme: "Next one",
    copyOrganizers: true,
    copySettings: true,
    copyCompetitions: false,
    copyFaq: false,
    ...overrides,
  };
}

describe.skipIf(!isLocalDatabase)("war_week_one_live index", () => {
  it("rejects a second live War Week in the database itself", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { schema } = await fixture(tx);
      const { isUniqueViolation } = await import("@/mutations/setup");
      const second = tx.transaction(async (sp) => {
        await sp.insert(schema.warWeek).values(warWeekValues(2, "live"));
      });
      await expect(second).rejects.toSatisfy(isUniqueViolation);
    });
  });
});

describe.skipIf(!isLocalDatabase)("Start, End and Reopen", () => {
  it("ends a live War Week with its Winner and highlights", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { endWarWeek } = await import("@/mutations/war-week-lifecycle");
      const { live, byId } = await fixture(tx);

      const result = await endWarWeek(
        live.id,
        { winner: "Red & Blue", highlights: ["Red won Chess"] },
        tx,
      );

      expect(result).toEqual({ ok: true });
      expect(await byId(live.id)).toMatchObject({
        status: "complete",
        winner: "Red & Blue",
        highlights: ["Red won Chess"],
      });
    });
  });

  it("refuses to start a War Week while another is live", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { startWarWeek } = await import("@/mutations/war-week-lifecycle");
      const { schema, byId } = await fixture(tx);
      const [upcoming] = await tx
        .insert(schema.warWeek)
        .values(warWeekValues(2, "upcoming"))
        .returning();

      expect(await startWarWeek(upcoming.id, tx)).toEqual({
        ok: false,
        error: "End TI first.",
      });
      expect((await byId(upcoming.id)).status).toBe("upcoming");
    });
  });

  it("starts the next War Week once the live one has ended", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { endWarWeek, startWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, schema, byId } = await fixture(tx);
      const [upcoming] = await tx
        .insert(schema.warWeek)
        .values(warWeekValues(2, "upcoming"))
        .returning();

      await endWarWeek(live.id, { winner: "Red", highlights: [] }, tx);
      expect(await startWarWeek(upcoming.id, tx)).toEqual({ ok: true });
      expect((await byId(upcoming.id)).status).toBe("live");
    });
  });

  it("reopens a complete War Week only when nothing else is live", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { endWarWeek, reopenWarWeek, startWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, schema, byId } = await fixture(tx);
      const [upcoming] = await tx
        .insert(schema.warWeek)
        .values(warWeekValues(2, "upcoming"))
        .returning();
      await endWarWeek(live.id, { winner: "Red", highlights: [] }, tx);
      await startWarWeek(upcoming.id, tx);

      expect(await reopenWarWeek(live.id, tx)).toEqual({
        ok: false,
        error: "End TII first.",
      });

      await endWarWeek(upcoming.id, { winner: null, highlights: [] }, tx);
      expect(await reopenWarWeek(live.id, tx)).toEqual({ ok: true });
      expect(await byId(live.id)).toMatchObject({
        status: "live",
        winner: "Red",
      });
    });
  });

  it("refuses moves that aren't Start, End or Reopen", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { endWarWeek, startWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, schema } = await fixture(tx);
      const [upcoming] = await tx
        .insert(schema.warWeek)
        .values(warWeekValues(2, "upcoming"))
        .returning();

      expect(await startWarWeek(live.id, tx)).toEqual({
        ok: false,
        error: "This War Week is already live.",
      });
      expect(
        await endWarWeek(upcoming.id, { winner: null, highlights: [] }, tx),
      ).toEqual({ ok: false, error: "Start this War Week before ending it." });
      expect(
        await startWarWeek("00000000-0000-4000-8000-000000000000", tx),
      ).toEqual({ ok: false, error: "That War Week no longer exists." });
    });
  });
});

describe.skipIf(!isLocalDatabase)("createNextWarWeek", () => {
  it("copies Organizers and settings by default and nothing else", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createNextWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, schema } = await fixture(tx);
      const { eq } = await import("drizzle-orm");

      const result = await createNextWarWeek(live.id, next(), actorEmail, tx);
      expect(result).toEqual({ ok: true, edition: "tii" });

      const [created] = await tx
        .select()
        .from(schema.warWeek)
        .where(eq(schema.warWeek.edition, "tii"));
      expect(created).toMatchObject({
        editionNumber: 9302,
        year: 9302,
        startDate: "2100-01-01",
        endDate: "2100-01-05",
        storyTheme: "Next one",
        status: "upcoming",
        winner: null,
        highlights: [],
        mode: "teams",
        teamLabel: "House",
        leaderTitle: "Head of House",
        slackChannelUrl: "https://example.slack.com/archives/lifecycle",
        wikiUrl: "https://example.com/wiki",
        primaryColor: "#123456",
        primaryForegroundColor: "#fefefe",
        accentColor: "#abcdef",
        backgroundColor: "#101010",
        foregroundColor: "#efefef",
        fontPreset: "serif",
        logoUrl: "/themes/t/logo.svg",
        bannerUrl: "/themes/t/banner.svg",
        organizerEmails: [
          "lead@jahnelgroup.com",
          "other@jahnelgroup.com",
          actorEmail,
        ],
      });
      for (const table of [
        schema.team,
        schema.participant,
        schema.day,
        schema.competition,
        schema.faqItem,
        schema.award,
        schema.announcement,
      ]) {
        const rows = await tx
          .select()
          .from(table)
          .where(eq(table.warWeekId, created.id));
        expect(rows).toEqual([]);
      }
    });
  });

  it("copies Competitions and the FAQ with new ids when chosen", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createNextWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, chess, schema } = await fixture(tx);
      const { eq } = await import("drizzle-orm");

      await createNextWarWeek(
        live.id,
        next({ copyCompetitions: true, copyFaq: true }),
        actorEmail,
        tx,
      );
      const [created] = await tx
        .select({ id: schema.warWeek.id })
        .from(schema.warWeek)
        .where(eq(schema.warWeek.edition, "tii"));
      const competitions = await tx
        .select()
        .from(schema.competition)
        .where(eq(schema.competition.warWeekId, created.id));
      expect(competitions).toHaveLength(1);
      expect(competitions[0]).toMatchObject({
        name: "Chess",
        description: "1v1",
        maxPoints: 10,
        placementPoints: [10, 5],
        scoring: "team",
        countsTowardTeam: false,
        competitionGroup: "Board games",
      });
      expect(competitions[0].id).not.toBe(chess.id);
      const entries = await tx
        .select()
        .from(schema.pointsEntry)
        .where(eq(schema.pointsEntry.competitionId, competitions[0].id));
      expect(entries).toEqual([]);
      const faq = await tx
        .select({ question: schema.faqItem.question })
        .from(schema.faqItem)
        .where(eq(schema.faqItem.warWeekId, created.id));
      expect(faq).toEqual([{ question: "Where?" }]);
    });
  });

  it("makes the creator the only Organizer when Organizers aren't copied, and uses defaults without settings", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createNextWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live, schema } = await fixture(tx);
      const { eq } = await import("drizzle-orm");

      await createNextWarWeek(
        live.id,
        next({ copyOrganizers: false, copySettings: false }),
        "Creator@JahnelGroup.com",
        tx,
      );
      const [created] = await tx
        .select()
        .from(schema.warWeek)
        .where(eq(schema.warWeek.edition, "tii"));
      expect(created.organizerEmails).toEqual([actorEmail]);
      expect(created).toMatchObject({
        mode: "teams",
        teamLabel: "Team",
        leaderTitle: "Captain",
        wikiUrl: null,
        logoUrl: null,
        bannerUrl: null,
        fontPreset: "sans",
      });
      expect(created.primaryColor).not.toBe("#123456");
    });
  });

  it("turns a taken edition, edition number or year into a friendly error", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createNextWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      const { live } = await fixture(tx);

      expect(
        await createNextWarWeek(
          live.id,
          next({ edition: "ti" }),
          actorEmail,
          tx,
        ),
      ).toEqual({ ok: false, error: "War Week TI already exists." });
      expect(
        await createNextWarWeek(
          live.id,
          next({ editionNumber: 9301 }),
          actorEmail,
          tx,
        ),
      ).toEqual({
        ok: false,
        error: "Edition number 9301 is already War Week TI.",
      });
      expect(
        await createNextWarWeek(live.id, next({ year: 9301 }), actorEmail, tx),
      ).toEqual({ ok: false, error: "9301 already has War Week TI." });
    });
  });

  it("refuses a source War Week that doesn't exist", async () => {
    await inRolledBackTransaction(async (tx) => {
      const { createNextWarWeek } =
        await import("@/mutations/war-week-lifecycle");
      expect(
        await createNextWarWeek(
          "00000000-0000-4000-8000-000000000000",
          next(),
          actorEmail,
          tx,
        ),
      ).toEqual({ ok: false, error: "That War Week no longer exists." });
    });
  });
});
