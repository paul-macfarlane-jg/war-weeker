"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import * as mutations from "@/mutations/war-weeks";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export type StandingsVisibilityResult =
  { ok: true } | { ok: false; error: string };

/**
 * Hides or reveals the current War Week's Standings, the one `/admin`
 * manages. Takes no War Week id from the client.
 */
async function setStandingsHidden(
  hidden: boolean,
): Promise<StandingsVisibilityResult> {
  const warWeek = await getCurrentWarWeek();
  if (!warWeek) return { ok: false, error: "There's no current War Week." };
  const organizer = await requireOrganizer(warWeek);
  if (!organizer.ok) return organizer;

  const result = await mutations.setStandingsHidden(hidden, {
    warWeekId: warWeek.id,
    actorEmail: organizer.email,
  });
  if (result.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath(`/${warWeek.edition}`, "layout");
  }
  return result;
}

export async function hideStandings(): Promise<StandingsVisibilityResult> {
  return setStandingsHidden(true);
}

export async function revealStandings(): Promise<StandingsVisibilityResult> {
  return setStandingsHidden(false);
}
