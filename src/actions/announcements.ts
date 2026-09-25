"use server";

import { revalidatePath } from "next/cache";

import { requireAdminWarWeek, requireOrganizer } from "@/auth/organizer";
import {
  type AnnouncementInput,
  parseAnnouncementInput,
} from "@/lib/announcements";
import * as mutations from "@/mutations/announcements";
import { getAnnouncementWarWeek } from "@/queries/announcements";

export type AnnouncementActionResult =
  { ok: true } | { ok: false; error: string };

const NOT_FOUND = "That Announcement no longer exists.";

type OrganizerWarWeek = NonNullable<
  Awaited<ReturnType<typeof getAnnouncementWarWeek>>
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

export async function createAnnouncement(
  input: AnnouncementInput,
): Promise<AnnouncementActionResult> {
  // No row to derive it from: the War Week selected in `/admin`.
  const selected = await requireAdminWarWeek();
  if (!selected.ok) return selected;
  const { warWeek } = selected;
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseAnnouncementInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.createAnnouncement(
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<AnnouncementActionResult> {
  const warWeek = await getAnnouncementWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const parsed = parseAnnouncementInput(input);
  if (!parsed.ok) return parsed;

  const result = await mutations.updateAnnouncement(
    id,
    parsed.value,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function deleteAnnouncement(
  id: string,
): Promise<AnnouncementActionResult> {
  const warWeek = await getAnnouncementWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.deleteAnnouncement(id, organizer.ctx);
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

async function setPinned(
  id: string,
  pinned: boolean,
): Promise<AnnouncementActionResult> {
  const warWeek = await getAnnouncementWarWeek(id);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await organizerContext(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.setAnnouncementPinned(
    id,
    pinned,
    organizer.ctx,
  );
  if (result.ok) revalidateWarWeek(warWeek.edition);
  return result;
}

export async function pinAnnouncement(
  id: string,
): Promise<AnnouncementActionResult> {
  return setPinned(id, true);
}

export async function unpinAnnouncement(
  id: string,
): Promise<AnnouncementActionResult> {
  return setPinned(id, false);
}
