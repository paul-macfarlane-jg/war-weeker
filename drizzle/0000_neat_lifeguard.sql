CREATE TYPE "public"."font_preset" AS ENUM('sans', 'serif', 'mono');--> statement-breakpoint
CREATE TYPE "public"."war_week_mode" AS ENUM('teams', 'free-for-all');--> statement-breakpoint
CREATE TYPE "public"."war_week_status" AS ENUM('upcoming', 'live', 'complete');--> statement-breakpoint
CREATE TABLE "day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"war_week_id" uuid NOT NULL,
	"date" date NOT NULL,
	"day_theme" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_war_week_id_date_unique" UNIQUE("war_week_id","date")
);
--> statement-breakpoint
CREATE TABLE "war_week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition" varchar(8) NOT NULL,
	"edition_number" integer NOT NULL,
	"year" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"story_theme" varchar(120) NOT NULL,
	"status" "war_week_status" NOT NULL,
	"mode" "war_week_mode" NOT NULL,
	"team_label" varchar(40) NOT NULL,
	"leader_title" varchar(40) NOT NULL,
	"slack_channel_url" varchar(500) NOT NULL,
	"standings_hidden" boolean DEFAULT false NOT NULL,
	"primary_color" varchar(32) NOT NULL,
	"primary_foreground_color" varchar(32) NOT NULL,
	"accent_color" varchar(32) NOT NULL,
	"background_color" varchar(32) NOT NULL,
	"foreground_color" varchar(32) NOT NULL,
	"logo_url" varchar(500),
	"banner_url" varchar(500),
	"font_preset" "font_preset" NOT NULL,
	"wiki_url" varchar(500),
	"organizer_emails" varchar(254)[] DEFAULT '{}' NOT NULL,
	"winner" varchar(200),
	"highlights" varchar(500)[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "war_week_edition_unique" UNIQUE("edition"),
	CONSTRAINT "war_week_edition_number_unique" UNIQUE("edition_number"),
	CONSTRAINT "war_week_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "day" ADD CONSTRAINT "day_war_week_id_war_week_id_fk" FOREIGN KEY ("war_week_id") REFERENCES "public"."war_week"("id") ON DELETE cascade ON UPDATE no action;