import { asc, eq } from "drizzle-orm";

import { DBOrTx, db } from "@/db";
import { type FaqItem, type WarWeek, faqItem } from "@/db/schema";

/** A War Week's FAQ Items in their seed order. */
export async function getFaqItems(
  warWeek: Pick<WarWeek, "id">,
  dbOrTx: DBOrTx = db,
): Promise<FaqItem[]> {
  return dbOrTx
    .select()
    .from(faqItem)
    .where(eq(faqItem.warWeekId, warWeek.id))
    .orderBy(asc(faqItem.sortOrder), asc(faqItem.id));
}
