import { redirect } from "next/navigation";
import { cache } from "react";

import { getSessionEmail } from "@/auth/server";
import type { NavAccount } from "@/components/primary-nav";
import { isOrganizer } from "@/lib/access";
import { getCurrentWarWeek, getWarWeekByEdition } from "@/queries/war-weeks";

/**
 * Loads a War Week by its edition segment, memoized per request so the
 * `[edition]` layout and its pages can each call it without issuing
 * duplicate queries.
 */
export const getWarWeekForEdition = cache(async (edition: string) => {
  return getWarWeekByEdition(edition.toLowerCase());
});

/**
 * The signed-in user for the navigation, memoized per request. `/admin`
 * manages the current War Week, so the Admin link shows for its Organizers.
 * The proxy already requires sign-in; a missing session goes to sign-in.
 */
export const getNavAccount = cache(async (): Promise<NavAccount> => {
  const email = await getSessionEmail();
  if (!email) redirect("/sign-in");
  const current = await getCurrentWarWeek();
  return {
    email,
    isOrganizer: current ? isOrganizer(email, current) : false,
  };
});
