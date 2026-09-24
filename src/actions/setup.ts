"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireOrganizer } from "@/auth/organizer";
import type { WarWeek } from "@/db/schema";
import {
  type CompetitionInput,
  type DayInput,
  type ParticipantInput,
  type TeamInput,
  type WarWeekSettingsInput,
  parseCompetitionInput,
  parseDayInput,
  parseParticipantInput,
  parseTeamInput,
  parseWarWeekSettingsInput,
} from "@/lib/setup";
import * as mutations from "@/mutations/setup";
import type { MutationContext, MutationResult } from "@/mutations/types";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export type SetupActionResult = MutationResult;

const NO_WAR_WEEK = "There's no current War Week.";

/** The mutation context when the caller is an Organizer of `warWeek`. */
async function organizerContext(
  warWeek: Pick<WarWeek, "id" | "edition" | "organizerEmails">,
) {
  const organizer = await requireOrganizer(warWeek);
  if (!organizer.ok) return organizer;
  return {
    ok: true as const,
    ctx: { warWeekId: warWeek.id, actorEmail: organizer.email },
  };
}

// The Appearance Theme and settings show on every page of the War Week,
// the admin shell and the Archive, so revalidate the whole site.
function revalidateSite() {
  revalidatePath("/", "layout");
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Runs a setup write on the current War Week as its Organizer: refuses a
 * non-Organizer, then an invalid `parsed` input or an `id` not shaped like a
 * row id, runs `write`, and revalidates the site on success. Every setup
 * action goes through here.
 */
async function asOrganizer<T>(
  parsed: Parsed<T>,
  write: (value: T, ctx: MutationContext) => Promise<MutationResult>,
  id?: string,
): Promise<SetupActionResult> {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) return { ok: false, error: NO_WAR_WEEK };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;
  // A malformed id would make Postgres throw; it can't name a row anyway.
  if (id !== undefined && !z.uuid().safeParse(id).success) {
    return { ok: false, error: "That record no longer exists." };
  }
  if (!parsed.ok) return parsed;

  const result = await write(parsed.value, organizer.ctx);
  if (result.ok) revalidateSite();
  return result;
}

const nothing: Parsed<null> = { ok: true, value: null };

export async function updateWarWeekSettings(
  input: WarWeekSettingsInput,
): Promise<SetupActionResult> {
  return asOrganizer(
    parseWarWeekSettingsInput(input),
    mutations.updateWarWeekSettings,
  );
}

export async function createDay(input: DayInput): Promise<SetupActionResult> {
  return asOrganizer(parseDayInput(input), mutations.createDay);
}

// Days (like every setup record) are the current War Week's only: the
// mutations refuse a row of any other War Week.
export async function updateDay(
  id: string,
  input: DayInput,
): Promise<SetupActionResult> {
  return asOrganizer(
    parseDayInput(input),
    (value, ctx) => mutations.updateDay(id, value, ctx),
    id,
  );
}

export async function deleteDay(id: string): Promise<SetupActionResult> {
  return asOrganizer(nothing, (_, ctx) => mutations.deleteDay(id, ctx), id);
}

export async function createTeam(input: TeamInput): Promise<SetupActionResult> {
  return asOrganizer(parseTeamInput(input), mutations.createTeam);
}

export async function updateTeam(
  id: string,
  input: TeamInput,
): Promise<SetupActionResult> {
  return asOrganizer(
    parseTeamInput(input),
    (value, ctx) => mutations.updateTeam(id, value, ctx),
    id,
  );
}

export async function deleteTeam(id: string): Promise<SetupActionResult> {
  return asOrganizer(nothing, (_, ctx) => mutations.deleteTeam(id, ctx), id);
}

export async function createParticipant(
  input: ParticipantInput,
): Promise<SetupActionResult> {
  return asOrganizer(parseParticipantInput(input), mutations.createParticipant);
}

export async function updateParticipant(
  id: string,
  input: ParticipantInput,
): Promise<SetupActionResult> {
  return asOrganizer(
    parseParticipantInput(input),
    (value, ctx) => mutations.updateParticipant(id, value, ctx),
    id,
  );
}

export async function deleteParticipant(
  id: string,
): Promise<SetupActionResult> {
  return asOrganizer(
    nothing,
    (_, ctx) => mutations.deleteParticipant(id, ctx),
    id,
  );
}

export async function createCompetition(
  input: CompetitionInput,
): Promise<SetupActionResult> {
  return asOrganizer(parseCompetitionInput(input), mutations.createCompetition);
}

export async function updateCompetition(
  id: string,
  input: CompetitionInput,
): Promise<SetupActionResult> {
  return asOrganizer(
    parseCompetitionInput(input),
    (value, ctx) => mutations.updateCompetition(id, value, ctx),
    id,
  );
}

export async function deleteCompetition(
  id: string,
): Promise<SetupActionResult> {
  return asOrganizer(
    nothing,
    (_, ctx) => mutations.deleteCompetition(id, ctx),
    id,
  );
}
