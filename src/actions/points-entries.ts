"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import {
  type PointsEntryInput,
  parsePointsEntryInput,
} from "@/lib/points-entry";
import * as mutations from "@/mutations/points-entries";
import {
  getCompetitionWarWeek,
  getPointsEntryWarWeek,
} from "@/queries/points-entries";

export type PointsEntryActionResult =
  { ok: true } | { ok: false; error: string };

const NOT_FOUND = "That Points Entry no longer exists.";

type OrganizerWarWeek = NonNullable<
  Awaited<ReturnType<typeof getPointsEntryWarWeek>>
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
}

export async function createPointsEntry(
  input: PointsEntryInput,
): Promise<PointsEntryActionResult> {
  const warWeek = await getCompetitionWarWeek(input.competitionId);
  if (!warWeek) return { ok: false, error: "Choose a Competition." };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parsePointsEntryInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createPointsEntry(parsed.value, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function updatePointsEntry(
  id: string,
  input: PointsEntryInput,
): Promise<PointsEntryActionResult> {
  const warWeek = await getPointsEntryWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parsePointsEntryInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updatePointsEntry(
    id,
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function deletePointsEntry(
  id: string,
): Promise<PointsEntryActionResult> {
  const warWeek = await getPointsEntryWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.deletePointsEntry(id, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}
