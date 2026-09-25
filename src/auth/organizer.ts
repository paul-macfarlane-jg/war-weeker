import { cookies } from "next/headers";

import { getSessionEmail } from "@/auth/server";
import type { WarWeek } from "@/db/schema";
import { canAdministerWarWeek, defaultAdminWarWeek } from "@/lib/access";
import {
  getCurrentWarWeek,
  getWarWeeks,
  selectCurrentWarWeek,
} from "@/queries/war-weeks";

type OrganizerWarWeek = Pick<WarWeek, "organizerEmails" | "edition" | "status">;

/** The cookie the admin edition switcher sets (see `selectAdminEdition`). */
export const ADMIN_EDITION_COOKIE = "admin_edition";

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
 * cookie when `email` may still administer it, otherwise
 * `defaultAdminWarWeek` (the current War Week for its Organizers, else the
 * email's own upcoming or newest past edition). Pass `loaded` when the
 * caller already has every War Week. Undefined only when there's no War
 * Week at all.
 */
export async function getAdminWarWeek(
  email: string | null,
  loaded?: { warWeeks: WarWeek[]; current: WarWeek | undefined },
): Promise<WarWeek | undefined> {
  const warWeeks = loaded?.warWeeks ?? (await getWarWeeks());
  const current = loaded ? loaded.current : selectCurrentWarWeek(warWeeks);
  if (!current) return undefined;
  const edition = (await cookies()).get(ADMIN_EDITION_COOKIE)?.value;
  const selected = edition
    ? warWeeks.find((w) => w.edition === edition)
    : undefined;
  if (selected && canAdministerWarWeek(email, selected, current)) {
    return selected;
  }
  return defaultAdminWarWeek(email, warWeeks, current);
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
