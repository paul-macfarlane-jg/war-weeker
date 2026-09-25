"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { ADMIN_EDITION_COOKIE, requireOrganizer } from "@/auth/organizer";
import { getSessionEmail } from "@/auth/server";
import { db } from "@/db";
import { type WarWeek, warWeek as warWeekTable } from "@/db/schema";
import { canAdministerWarWeek } from "@/lib/access";
import {
  type ClosingInput,
  type NextWarWeekInput,
  parseClosingInput,
  parseNextWarWeekInput,
} from "@/lib/war-week-lifecycle";
import type { MutationResult } from "@/mutations/types";
import * as mutations from "@/mutations/war-week-lifecycle";
import { getCurrentWarWeek, getWarWeekByEdition } from "@/queries/war-weeks";

export type LifecycleActionResult = MutationResult;

const NOT_FOUND = "That War Week no longer exists.";

/**
 * The War Week named by the id in the request, when the caller may
 * administer it. The access check is for that War Week, re-done here.
 */
async function organizerWarWeek(
  warWeekId: string,
): Promise<
  { ok: true; warWeek: WarWeek; email: string } | { ok: false; error: string }
> {
  if (!z.uuid().safeParse(warWeekId).success) {
    return { ok: false, error: NOT_FOUND };
  }
  const [found] = await db
    .select()
    .from(warWeekTable)
    .where(eq(warWeekTable.id, warWeekId));
  if (!found) return { ok: false, error: NOT_FOUND };
  const organizer = await requireOrganizer(found);
  if (!organizer.ok) return organizer;
  return { ok: true, warWeek: found, email: organizer.email };
}

// Status decides the current War Week, the home redirect and the Archive,
// so every lifecycle change revalidates the whole site.
function revalidateSite() {
  revalidatePath("/", "layout");
}

/** Start War Week: `upcoming → live`. Refused while another is live. */
export async function startWarWeek(
  warWeekId: string,
): Promise<LifecycleActionResult> {
  const organizer = await organizerWarWeek(warWeekId);
  if (!organizer.ok) return organizer;
  const result = await mutations.startWarWeek(organizer.warWeek.id);
  if (result.ok) revalidateSite();
  return result;
}

/** End War Week: `live → complete`, recording the Winner and highlights. */
export async function endWarWeek(
  warWeekId: string,
  input: ClosingInput,
): Promise<LifecycleActionResult> {
  const organizer = await organizerWarWeek(warWeekId);
  if (!organizer.ok) return organizer;
  const parsed = parseClosingInput(input);
  if (!parsed.ok) return parsed;
  const result = await mutations.endWarWeek(organizer.warWeek.id, parsed.value);
  if (result.ok) revalidateSite();
  return result;
}

/** Reopen: `complete → live`, for corrections. Refused while another is live. */
export async function reopenWarWeek(
  warWeekId: string,
): Promise<LifecycleActionResult> {
  const organizer = await organizerWarWeek(warWeekId);
  if (!organizer.ok) return organizer;
  const result = await mutations.reopenWarWeek(organizer.warWeek.id);
  if (result.ok) revalidateSite();
  return result;
}

async function setAdminEditionCookie(edition: string, isCurrent: boolean) {
  const jar = await cookies();
  if (isCurrent) {
    jar.delete(ADMIN_EDITION_COOKIE);
    return;
  }
  jar.set(ADMIN_EDITION_COOKIE, edition, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/**
 * Create next War Week from the War Week `fromWarWeekId` (the caller must
 * be able to administer it), then selects the new edition in `/admin`.
 */
export async function createNextWarWeek(
  fromWarWeekId: string,
  input: NextWarWeekInput,
): Promise<{ ok: true; edition: string } | { ok: false; error: string }> {
  const organizer = await organizerWarWeek(fromWarWeekId);
  if (!organizer.ok) return organizer;
  const parsed = parseNextWarWeekInput(input);
  if (!parsed.ok) return parsed;
  const result = await mutations.createNextWarWeek(
    organizer.warWeek.id,
    parsed.value,
    organizer.email,
  );
  if (result.ok) {
    const current = await getCurrentWarWeek();
    await setAdminEditionCookie(
      result.edition,
      current?.edition === result.edition,
    );
    revalidateSite();
  }
  return result;
}

/**
 * The admin edition switcher: remembers which War Week `/admin` works on,
 * when the caller may administer it. The pages and actions re-check it on
 * every request anyway.
 */
export async function selectAdminEdition(
  edition: string,
): Promise<LifecycleActionResult> {
  const email = await getSessionEmail();
  if (!email) return { ok: false, error: "Sign in to continue." };
  const [target, current] = await Promise.all([
    typeof edition === "string" ? getWarWeekByEdition(edition) : undefined,
    getCurrentWarWeek(),
  ]);
  if (!target || !canAdministerWarWeek(email, target, current)) {
    return {
      ok: false,
      error: "You can't administer that War Week.",
    };
  }
  await setAdminEditionCookie(target.edition, target.id === current?.id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
