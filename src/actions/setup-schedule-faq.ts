"use server";

import { revalidatePath } from "next/cache";

import { requireAdminWarWeek } from "@/auth/organizer";
import {
  type FaqItemInput,
  type ScheduleItemInput,
  isSetupItemId,
  parseFaqItemInput,
  parseScheduleItemInput,
} from "@/lib/setup-schedule-faq";
import * as mutations from "@/mutations/setup-schedule-faq";
import type { MutationResult } from "@/mutations/types";

export type SetupScheduleFaqActionResult = MutationResult;

const SCHEDULE_ITEM_NOT_FOUND = "That Schedule Item no longer exists.";
const FAQ_ITEM_NOT_FOUND = "That FAQ Item no longer exists.";

/**
 * The mutation context when the caller is an Organizer of the War Week
 * selected in `/admin`. Only that War Week: the mutations refuse any other's
 * rows.
 */
async function organizerContext() {
  const organizer = await requireAdminWarWeek();
  if (!organizer.ok) return organizer;
  const { warWeek } = organizer;
  return {
    ok: true as const,
    edition: warWeek.edition,
    ctx: { warWeekId: warWeek.id, actorEmail: organizer.email },
  };
}

// The Schedule shows on the War Week's home (Now/Next), Schedule and
// Competition pages; the FAQ on its FAQ page.
function revalidateWarWeek(edition: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/${edition}`, "layout");
}

export async function createScheduleItem(
  input: ScheduleItemInput,
): Promise<SetupScheduleFaqActionResult> {
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;
  const parsed = parseScheduleItemInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createScheduleItem(
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function updateScheduleItem(
  id: string,
  input: ScheduleItemInput,
): Promise<SetupScheduleFaqActionResult> {
  if (!isSetupItemId(id)) return { ok: false, error: SCHEDULE_ITEM_NOT_FOUND };
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;
  const parsed = parseScheduleItemInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateScheduleItem(
    id,
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function deleteScheduleItem(
  id: string,
): Promise<SetupScheduleFaqActionResult> {
  if (!isSetupItemId(id)) return { ok: false, error: SCHEDULE_ITEM_NOT_FOUND };
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;

  const result = await mutations.deleteScheduleItem(id, organizer.ctx);
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function createFaqItem(
  input: FaqItemInput,
): Promise<SetupScheduleFaqActionResult> {
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;
  const parsed = parseFaqItemInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createFaqItem(parsed.value, organizer.ctx);
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function updateFaqItem(
  id: string,
  input: FaqItemInput,
): Promise<SetupScheduleFaqActionResult> {
  if (!isSetupItemId(id)) return { ok: false, error: FAQ_ITEM_NOT_FOUND };
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;
  const parsed = parseFaqItemInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateFaqItem(id, parsed.value, organizer.ctx);
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function deleteFaqItem(
  id: string,
): Promise<SetupScheduleFaqActionResult> {
  if (!isSetupItemId(id)) return { ok: false, error: FAQ_ITEM_NOT_FOUND };
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;

  const result = await mutations.deleteFaqItem(id, organizer.ctx);
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}

export async function moveFaqItem(
  id: string,
  direction: "up" | "down",
): Promise<SetupScheduleFaqActionResult> {
  if (!isSetupItemId(id)) return { ok: false, error: FAQ_ITEM_NOT_FOUND };
  if (direction !== "up" && direction !== "down") {
    return { ok: false, error: "Move an FAQ Item up or down." };
  }
  const organizer = await organizerContext();
  if (!organizer.ok) return organizer;

  const result = await mutations.moveFaqItem(id, direction, organizer.ctx);
  if (result.ok) revalidateWarWeek(organizer.edition);
  return result;
}
