CREATE TYPE "public"."competition_scoring" AS ENUM('team', 'individual');--> statement-breakpoint
CREATE TYPE "public"."schedule_item_category" AS ENUM('competition', 'education', 'social', 'meal', 'work');--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" jsonb NOT NULL,
	"video_urls" varchar(500)[] DEFAULT '{}' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"author_email" varchar(254) NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seed_key" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_war_week_id_seed_key_unique" UNIQUE("war_week_id","seed_key")
);
--> statement-breakpoint
CREATE TABLE "award" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(1000),
	"team_id" uuid,
	"seed_key" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "award_war_week_id_seed_key_unique" UNIQUE("war_week_id","seed_key")
);
--> statement-breakpoint
CREATE TABLE "award_participant" (
	"award_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	CONSTRAINT "award_participant_award_id_participant_id_pk" PRIMARY KEY("award_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "competition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(2000),
	"max_points" numeric(8, 2),
	"scoring" "competition_scoring" NOT NULL,
	"counts_toward_team" boolean DEFAULT false NOT NULL,
	"competition_group" varchar(120),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "competition_war_week_id_name_unique" UNIQUE("war_week_id","name"),
	CONSTRAINT "competition_counts_toward_team_individual_only" CHECK (not "competition"."counts_toward_team" or "competition"."scoring" = 'individual')
);
--> statement-breakpoint
CREATE TABLE "faq_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"question" varchar(300) NOT NULL,
	"answer" jsonb NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "faq_item_war_week_id_question_unique" UNIQUE("war_week_id","question")
);
--> statement-breakpoint
CREATE TABLE "participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"company_tag" varchar(40),
	"email" varchar(254),
	"team_id" uuid,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "participant_war_week_id_display_name_unique" UNIQUE("war_week_id","display_name"),
	CONSTRAINT "participant_war_week_id_email_unique" UNIQUE("war_week_id","email")
);
--> statement-breakpoint
CREATE TABLE "points_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"team_id" uuid,
	"participant_id" uuid,
	"points" numeric(8, 2) NOT NULL,
	"note" varchar(500),
	"entered_by_email" varchar(254) NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seed_key" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "points_entry_competition_id_seed_key_unique" UNIQUE("competition_id","seed_key"),
	CONSTRAINT "points_entry_exactly_one_target" CHECK (num_nonnulls("points_entry"."team_id", "points_entry"."participant_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "schedule_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"title" varchar(200) NOT NULL,
	"host" varchar(200),
	"location" varchar(200),
	"virtual_link" varchar(500),
	"description" jsonb,
	"category" "schedule_item_category" NOT NULL,
	"competition_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_item_day_id_start_time_title_unique" UNIQUE("day_id","start_time","title")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"color" varchar(32) NOT NULL,
	"logo_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_war_week_id_name_unique" UNIQUE("war_week_id","name")
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award" ADD CONSTRAINT "award_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award" ADD CONSTRAINT "award_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_participant" ADD CONSTRAINT "award_participant_award_id_award_id_fk" FOREIGN KEY ("award_id") REFERENCES "public"."award"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_participant" ADD CONSTRAINT "award_participant_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition" ADD CONSTRAINT "competition_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_item" ADD CONSTRAINT "faq_item_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_entry" ADD CONSTRAINT "points_entry_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_entry" ADD CONSTRAINT "points_entry_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_entry" ADD CONSTRAINT "points_entry_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_day_id_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."day"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_item" ADD CONSTRAINT "schedule_item_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;