import { notFound, redirect } from "next/navigation";

import { getAdminAccess } from "@/auth/organizer";
import { getCurrentWarWeek } from "@/queries/war-weeks";

/**
 * The `/admin` gate for the current War Week. Every admin page calls this
 * first: anonymous users go to sign-in and come back to `returnTo`; the
 * caller renders the refusal for `not-organizer`.
 */
export async function loadAdminPage(returnTo: string) {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) notFound();

  const { access, email } = await getAdminAccess(warWeek);
  if (access === "anonymous" || !email) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(returnTo)}`);
  }

  return { warWeek, email, isOrganizer: access === "organizer" };
}
