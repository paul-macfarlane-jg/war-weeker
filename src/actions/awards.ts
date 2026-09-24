"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import { type AwardInput, parseAwardInput } from "@/lib/awards";
import * as mutations from "@/mutations/awards";
import type { MutationResult } from "@/mutations/types";
import { getAwardWarWeek } from "@/queries/awards";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export type AwardActionResult = MutationResult;

const NOT_FOUND = "That Award no longer exists.";

type OrganizerWarWeek = NonNullable<
  Awaited<ReturnType<typeof getAwardWarWeek>>
>;

/** The mutation context when the caller is an Organizer of `warWeek`. */
async function organizerContext(warWeek: OrganizerWarWeek) {
  const organizer = await requireOrganizer(warWeek);
  if (!organizer.ok) return organizer;
  return {
    ok: true as const,
    ctx: { warWeekId: warWeek.id, actorEmail: organizer.email },
  };
}

function revalidateWarWeek(edition: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/${edition}`, "layout");
  // A complete War Week's Awards also show in the Archive.
  revalidatePath("/history", "layout");
}

export async function createAward(
  input: AwardInput,
): Promise<AwardActionResult> {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) return { ok: false, error: "There's no current War Week." };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseAwardInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createAward(parsed.value, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function updateAward(
  id: string,
  input: AwardInput,
): Promise<AwardActionResult> {
  const warWeek = await getAwardWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseAwardInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateAward(id, parsed.value, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function deleteAward(id: string): Promise<AwardActionResult> {
  const warWeek = await getAwardWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.deleteAward(id, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}
