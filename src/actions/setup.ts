"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import type { WarWeek } from "@/db/schema";
import {
  type DayInput,
  type WarWeekSettingsInput,
  parseDayInput,
  parseWarWeekSettingsInput,
} from "@/lib/setup";
import * as mutations from "@/mutations/setup";
import type { MutationResult } from "@/mutations/types";
import { getDayWarWeek } from "@/queries/setup";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export type SetupActionResult = MutationResult;

const NO_WAR_WEEK = "There's no current War Week.";
const DAY_NOT_FOUND = "That Day no longer exists.";

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

export async function updateWarWeekSettings(
  input: WarWeekSettingsInput,
): Promise<SetupActionResult> {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) return { ok: false, error: NO_WAR_WEEK };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseWarWeekSettingsInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateWarWeekSettings(
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateSite();
  return result;
}

export async function createDay(input: DayInput): Promise<SetupActionResult> {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) return { ok: false, error: NO_WAR_WEEK };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseDayInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createDay(parsed.value, organizer.ctx);
  if (result.ok) revalidateSite();
  return result;
}

export async function updateDay(
  id: string,
  input: DayInput,
): Promise<SetupActionResult> {
  const warWeek = await getDayWarWeek(id);
  if (!warWeek) return { ok: false, error: DAY_NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseDayInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateDay(id, parsed.value, organizer.ctx);
  if (result.ok) revalidateSite();
  return result;
}

export async function deleteDay(id: string): Promise<SetupActionResult> {
  const warWeek = await getDayWarWeek(id);
  if (!warWeek) return { ok: false, error: DAY_NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.deleteDay(id, organizer.ctx);
  if (result.ok) revalidateSite();
  return result;
}
