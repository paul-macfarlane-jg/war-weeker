import { getSessionEmail } from "@/auth/server";
import type { WarWeek } from "@/db/schema";
import { type AdminAccess, adminAccess, isOrganizer } from "@/lib/access";

type OrganizerWarWeek = Pick<WarWeek, "organizerEmails" | "edition">;

/** Who is looking at an admin page for this War Week. */
export async function getAdminAccess(
  warWeek: OrganizerWarWeek,
): Promise<{ access: AdminAccess; email: string | null }> {
  const email = await getSessionEmail();
  return { access: adminAccess(email, warWeek), email };
}

/**
 * The Organizer check for server actions: the signed-in email when it is on
 * the War Week's organizer allowlist, otherwise an error to return to the
 * form. Never throws on a user error. Load `warWeek` from the row being
 * changed (e.g. a Competition's War Week), never from client input.
 */
export async function requireOrganizer(
  warWeek: OrganizerWarWeek,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, error: "Sign in to continue." };
  if (!isOrganizer(email, warWeek)) {
    return {
      ok: false,
      error: `You're not an Organizer for War Week ${warWeek.edition.toUpperCase()}.`,
    };
  }
  return { ok: true, email };
}
