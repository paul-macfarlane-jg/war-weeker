import { cookies } from "next/headers";

import { getSessionEmail } from "@/auth/server";
import { db } from "@/db";
import { type WarWeek, warWeek as warWeekTable } from "@/db/schema";
import {
  type AdminAccess,
  adminAccess,
  canAdministerWarWeek,
} from "@/lib/access";
import { getCurrentWarWeek, getWarWeekByEdition } from "@/queries/war-weeks";

type OrganizerWarWeek = Pick<WarWeek, "organizerEmails" | "edition" | "status">;

/** The cookie the admin edition switcher sets (see `selectAdminEdition`). */
export const ADMIN_EDITION_COOKIE = "admin_edition";

/** Who is looking at an admin page for this War Week. */
export async function getAdminAccess(
  warWeek: OrganizerWarWeek,
): Promise<{ access: AdminAccess; email: string | null }> {
  const [email, current] = await Promise.all([
    getSessionEmail(),
    getCurrentWarWeek(),
  ]);
  return { access: adminAccess(email, warWeek, current), email };
}

/**
 * The Organizer check for server actions: the signed-in email when it may
 * administer the War Week (`canAdministerWarWeek`: on its allowlist, or a
 * current-War-Week Organizer when it's `complete`), otherwise an error to
 * return to the form. Never throws on a user error. Load `warWeek` from the
 * row being changed (e.g. a Competition's War Week) or from the id in the
 * request, never trust anything else the client says about it.
 */
export async function requireOrganizer(
  warWeek: OrganizerWarWeek,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, error: "Sign in to continue." };
  const current = await getCurrentWarWeek();
  if (!canAdministerWarWeek(email, warWeek, current)) {
    return {
      ok: false,
      error: `You're not an Organizer for War Week ${warWeek.edition.toUpperCase()}.`,
    };
  }
  return { ok: true, email };
}

/**
 * The War Week `/admin` works on: the edition in the `admin_edition`
 * cookie when `email` may still administer it, otherwise the current War
 * Week. Undefined only when there's no War Week at all.
 */
export async function getAdminWarWeek(
  email: string | null,
  current?: WarWeek,
): Promise<WarWeek | undefined> {
  const currentWarWeek = current ?? (await getCurrentWarWeek());
  if (!currentWarWeek) return undefined;
  const edition = (await cookies()).get(ADMIN_EDITION_COOKIE)?.value;
  if (!edition || edition === currentWarWeek.edition) return currentWarWeek;
  const selected = await getWarWeekByEdition(edition);
  return selected && canAdministerWarWeek(email, selected, currentWarWeek)
    ? selected
    : currentWarWeek;
}

/** One entry in the admin edition switcher. */
export type AdminEdition = {
  edition: string;
  status: WarWeek["status"];
  current: boolean;
};

/**
 * The editions `email` may administer, newest first: their own editions,
 * plus every `complete` one when they organize the current War Week.
 */
export async function getAdminEditions(
  email: string,
  current: WarWeek,
): Promise<AdminEdition[]> {
  const rows = await db
    .select({
      id: warWeekTable.id,
      edition: warWeekTable.edition,
      editionNumber: warWeekTable.editionNumber,
      status: warWeekTable.status,
      organizerEmails: warWeekTable.organizerEmails,
    })
    .from(warWeekTable);
  return rows
    .filter((row) => canAdministerWarWeek(email, row, current))
    .sort((a, b) => b.editionNumber - a.editionNumber)
    .map((row) => ({
      edition: row.edition,
      status: row.status,
      current: row.id === current.id,
    }));
}

/**
 * The War Week a "create" action (no row id to derive it from) writes to:
 * the one the Organizer has selected in `/admin`, re-checked on the server.
 */
export async function requireAdminWarWeek(): Promise<
  { ok: true; warWeek: WarWeek; email: string } | { ok: false; error: string }
> {
  const email = await getSessionEmail();
  const warWeek = await getAdminWarWeek(email);
  if (!warWeek) return { ok: false, error: "There's no current War Week." };
  const organizer = await requireOrganizer(warWeek);
  if (!organizer.ok) return organizer;
  return { ok: true, warWeek, email: organizer.email };
}
