"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizer } from "@/auth/organizer";
import {
  isRowId,
  parseEntrantsInput,
  parseFormatInput,
  parseGenerateInput,
  parseHeatResultInput,
} from "@/lib/bracket/input";
import * as mutations from "@/mutations/brackets";
import type { MutationContext } from "@/mutations/types";
import { getCompetitionWarWeek } from "@/queries/points-entries";

export type BracketActionResult = { ok: true } | { ok: false; error: string };

export type HeatResultActionResult =
  { ok: true; resetHeatIds: string[] } | { ok: false; error: string };

const NOT_FOUND = "That Competition no longer exists.";

/**
 * Runs a Bracket write as an Organizer of the Competition's War Week (loaded
 * from the Competition row, never from client input), then revalidates the
 * War Week's pages.
 */
async function asOrganizer<R extends { ok: boolean }>(
  competitionId: unknown,
  write: (competitionId: string, ctx: MutationContext) => Promise<R>,
): Promise<R | { ok: false; error: string }> {
  if (!isRowId(competitionId)) return { ok: false, error: NOT_FOUND };
  const warWeek = await getCompetitionWarWeek(competitionId);
  if (!warWeek) return { ok: false, error: NOT_FOUND };
  const organizer = await requireOrganizer(warWeek);
  if (!organizer.ok) return organizer;

  const result = await write(competitionId, {
    warWeekId: warWeek.id,
    actorEmail: organizer.email,
  });
  if (result.ok) {
    revalidatePath("/admin", "layout");
    revalidatePath(`/${warWeek.edition}`, "layout");
  }
  return result;
}

export async function setCompetitionFormat(
  competitionId: string,
  input: unknown,
): Promise<BracketActionResult> {
  return asOrganizer(competitionId, async (id, ctx) => {
    const parsed = parseFormatInput(input);
    if (!parsed.ok) return parsed;
    return mutations.setCompetitionFormat(id, parsed.value, ctx);
  });
}

/** Sets the Entrants in Seed Position order; `force` clears Heat Results. */
export async function replaceEntrants(
  competitionId: string,
  input: unknown,
): Promise<BracketActionResult> {
  return asOrganizer(competitionId, async (id, ctx) => {
    const parsed = parseEntrantsInput(input);
    if (!parsed.ok) return parsed;
    return mutations.replaceEntrants(id, parsed.value.targetIds, ctx, {
      force: parsed.value.force,
    });
  });
}

/** Sets random Seed Positions and (re)builds the Bracket; `force` clears Heat Results. */
export async function generateBracket(
  competitionId: string,
  input: unknown = {},
): Promise<BracketActionResult> {
  return asOrganizer(competitionId, async (id, ctx) => {
    const parsed = parseGenerateInput(input);
    if (!parsed.ok) return parsed;
    return mutations.generateBracket(id, ctx, { force: parsed.value.force });
  });
}

export async function recordHeatResult(
  competitionId: string,
  heatId: string,
  input: unknown,
): Promise<HeatResultActionResult> {
  return asOrganizer(competitionId, async (id, ctx) => {
    if (!isRowId(heatId)) {
      return { ok: false, error: "That Heat no longer exists." };
    }
    const parsed = parseHeatResultInput(input);
    if (!parsed.ok) return parsed;
    return mutations.recordHeatResult(id, heatId, parsed.value, ctx);
  });
}

export async function finalizeBracket(
  competitionId: string,
): Promise<BracketActionResult> {
  return asOrganizer(competitionId, mutations.finalizeBracket);
}

export async function unfinalizeBracket(
  competitionId: string,
): Promise<BracketActionResult> {
  return asOrganizer(competitionId, mutations.unfinalizeBracket);
}
