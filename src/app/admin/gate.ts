import { notFound, redirect } from "next/navigation";

import { getAdminEditions, getAdminWarWeek } from "@/auth/organizer";
import { getSessionEmail } from "@/auth/server";
import { canAdministerWarWeek } from "@/lib/access";
import { getCurrentWarWeek } from "@/queries/war-weeks";

/**
 * The `/admin` gate. Every admin page calls this first: anonymous users go
 * to sign-in and come back to `returnTo`; the caller renders the refusal
 * for a non-Organizer. The War Week is the one picked in the edition
 * switcher (the `admin_edition` cookie) when the email may still
 * administer it, otherwise the current War Week.
 */
export async function loadAdminPage(returnTo: string) {
  const current = await getCurrentWarWeek();
  if (!current) notFound();

  const email = await getSessionEmail();
  if (!email) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(returnTo)}`);
  }

  const warWeek = (await getAdminWarWeek(email, current)) ?? current;
  const isOrganizer = canAdministerWarWeek(email, warWeek, current);
  const editions = isOrganizer ? await getAdminEditions(email, current) : [];

  return { warWeek, email, isOrganizer, editions };
}
