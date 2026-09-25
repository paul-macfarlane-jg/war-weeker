CREATE TYPE "public"."bracket_points" AS ENUM('placings', 'per-heat', 'both');--> statement-breakpoint
CREATE TYPE "public"."competition_format" AS ENUM('points', 'single-elimination');--> statement-breakpoint
CREATE TYPE "public"."heat_status" AS ENUM('pending', 'ready', 'played', 'forfeit');--> statement-breakpoint
CREATE TABLE "entrant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"team_id" uuid,
	"participant_id" uuid,
	"seed_position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "entrant_competition_id_team_id_unique" UNIQUE("competition_id","team_id"),
	CONSTRAINT "entrant_competition_id_participant_id_unique" UNIQUE("competition_id","participant_id"),
	CONSTRAINT "entrant_competition_id_seed_position_unique" UNIQUE("competition_id","seed_position"),
	CONSTRAINT "entrant_exactly_one_target" CHECK (num_nonnulls("entrant"."team_id", "entrant"."participant_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "heat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"position" integer NOT NULL,
	"status" "heat_status" DEFAULT 'pending' NOT NULL,
	"winner_to_heat_id" uuid,
	"winner_to_slot" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heat_competition_id_round_position_unique" UNIQUE("competition_id","round","position")
);
--> statement-breakpoint
CREATE TABLE "heat_entrant" (
	"heat_id" uuid NOT NULL,
	"entrant_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"place" integer,
	"score" varchar(40),
	"forfeited" boolean DEFAULT false NOT NULL,
	CONSTRAINT "heat_entrant_heat_id_slot_pk" PRIMARY KEY("heat_id","slot"),
	CONSTRAINT "heat_entrant_heat_id_entrant_id_unique" UNIQUE("heat_id","entrant_id")
);
--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "format" "competition_format" DEFAULT 'points' NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "bracket_points" "bracket_points" DEFAULT 'placings' NOT NULL;--> statement-breakpoint
ALTER TABLE "competition" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "points_entry" ADD COLUMN "generated_by_bracket" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "entrant" ADD CONSTRAINT "entrant_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrant" ADD CONSTRAINT "entrant_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrant" ADD CONSTRAINT "entrant_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat" ADD CONSTRAINT "heat_competition_id_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat" ADD CONSTRAINT "heat_winner_to_heat_id_heat_id_fk" FOREIGN KEY ("winner_to_heat_id") REFERENCES "public"."heat"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_entrant" ADD CONSTRAINT "heat_entrant_heat_id_heat_id_fk" FOREIGN KEY ("heat_id") REFERENCES "public"."heat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heat_entrant" ADD CONSTRAINT "heat_entrant_entrant_id_entrant_id_fk" FOREIGN KEY ("entrant_id") REFERENCES "public"."entrant"("id") ON DELETE cascade ON UPDATE no action;