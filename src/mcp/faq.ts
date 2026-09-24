import type { FaqItem } from "@/db/schema";
import { toPlainText } from "@/lib/rich-text/plain-text";

export type FaqResult = {
  edition: string;
  faq: { question: string; answer: string | null }[];
};

/**
 * Serializes a War Week's FAQ Items (already in sort order) into the
 * `get_faq` MCP tool payload, with each answer as plain text.
 */
export function toFaqResult(
  edition: string,
  items: Pick<FaqItem, "question" | "answer">[],
): FaqResult {
  return {
    edition,
    faq: items.map((item) => ({
      question: item.question,
      answer: toPlainText(item.answer),
    })),
  };
}
