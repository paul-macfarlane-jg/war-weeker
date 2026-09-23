import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const warWeekStatus = pgEnum("war_week_status", [
  "upcoming",
  "live",
  "complete",
]);

export const warWeekMode = pgEnum("war_week_mode", ["teams", "free-for-all"]);

export const fontPreset = pgEnum("font_preset", ["sans", "serif", "mono"]);

export const warWeek = pgTable("war_week", {
  id: uuid("id").primaryKey().defaultRandom(),
  edition: varchar("edition", { length: 8 }).notNull().unique(),
  editionNumber: integer("edition_number").notNull().unique(),
  year: integer("year").notNull().unique(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  storyTheme: varchar("story_theme", { length: 120 }).notNull(),
  status: warWeekStatus("status").notNull(),
  mode: warWeekMode("mode").notNull(),
  teamLabel: varchar("team_label", { length: 40 }).notNull(),
  leaderTitle: varchar("leader_title", { length: 40 }).notNull(),
  slackChannelUrl: varchar("slack_channel_url", { length: 500 }).notNull(),
  standingsHidden: boolean("standings_hidden").notNull().default(false),
  primaryColor: varchar("primary_color", { length: 32 }).notNull(),
  primaryForegroundColor: varchar("primary_foreground_color", {
    length: 32,
  }).notNull(),
  accentColor: varchar("accent_color", { length: 32 }).notNull(),
  backgroundColor: varchar("background_color", { length: 32 }).notNull(),
  foregroundColor: varchar("foreground_color", { length: 32 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  bannerUrl: varchar("banner_url", { length: 500 }),
  fontPreset: fontPreset("font_preset").notNull(),
  wikiUrl: varchar("wiki_url", { length: 500 }),
  organizerEmails: varchar("organizer_emails", { length: 254 })
    .array()
    .notNull()
    .default([]),
  winner: varchar("winner", { length: 200 }),
  highlights: varchar("highlights", { length: 500 })
    .array()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const day = pgTable(
  "day",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    warWeekId: uuid("war_week_id")
      .notNull()
      .references(() => warWeek.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    dayTheme: varchar("day_theme", { length: 120 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.warWeekId, table.date)],
);

export const warWeekRelations = relations(warWeek, ({ many }) => ({
  days: many(day),
}));

export const dayRelations = relations(day, ({ one }) => ({
  warWeek: one(warWeek, {
    fields: [day.warWeekId],
    references: [warWeek.id],
  }),
}));

export type WarWeek = InferSelectModel<typeof warWeek>;
export type NewWarWeek = InferInsertModel<typeof warWeek>;
export type Day = InferSelectModel<typeof day>;
export type NewDay = InferInsertModel<typeof day>;
