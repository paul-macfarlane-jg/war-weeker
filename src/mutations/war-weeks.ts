import { eq, sql } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { warWeek } from "@/db/schema";
import type { MutationContext, MutationResult } from "@/mutations/types";

/**
 * Hides the War Week's Standings from Participants and MCP, or reveals
 * them. Revealing is what open pages turn into the Reveal animation.
 */
export async function setStandingsHidden(
  hidden: boolean,
  ctx: MutationContext,
  dbOrTx: DBOrTx = db,
): Promise<MutationResult> {
  const updated = await dbOrTx
    .update(warWeek)
    .set({ standingsHidden: hidden, updatedAt: sql`now()` })
    .where(eq(warWeek.id, ctx.warWeekId))
    .returning({ id: warWeek.id });
  if (updated.length === 0) {
    return { ok: false, error: "That War Week no longer exists." };
  }
  return { ok: true };
}
