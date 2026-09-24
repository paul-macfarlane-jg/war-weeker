import { describe, expect, it } from "vitest";

import { toFaqResult } from "@/mcp/faq";

describe("toFaqResult", () => {
  it("keeps the order and renders each answer as plain text", () => {
    expect(
      toFaqResult("xi", [
        {
          question: "Can I bring guests?",
          answer: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Ask an Organizer." }],
              },
            ],
          },
        },
        { question: "Hours cutoff?", answer: { type: "doc", content: [] } },
      ]),
    ).toEqual({
      edition: "xi",
      faq: [
        { question: "Can I bring guests?", answer: "Ask an Organizer." },
        { question: "Hours cutoff?", answer: null },
      ],
    });
  });
});
