"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type SetupScheduleFaqActionResult,
  createFaqItem,
  updateFaqItem,
} from "@/actions/setup-schedule-faq";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import type { Content } from "@/lib/rich-text/content";

const fieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

const EMPTY_ANSWER: Content = { type: "doc", content: [] };

const BACK = "/admin/setup/faq";

/** Add or edit one FAQ Item: a question and its rich-text answer. */
export function FaqItemForm({
  itemId,
  initial,
}: {
  /** Set when editing an existing FAQ Item. */
  itemId?: string;
  initial?: { question: string; answer: Content };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState<Content>(
    initial?.answer ?? EMPTY_ANSWER,
  );
  const [result, setResult] = useState<SetupScheduleFaqActionResult | null>(
    null,
  );

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { question, answer };
    startTransition(async () => {
      const saved = itemId
        ? await updateFaqItem(itemId, input)
        : await createFaqItem(input);
      setResult(saved);
      if (!saved.ok) return;
      router.push(BACK);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5"
      aria-label="FAQ Item"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Question
        <input
          name="question"
          required
          maxLength={300}
          className={fieldClass}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Answer</span>
        <RichTextEditor content={answer} onChange={setAnswer} label="Answer" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : itemId ? "Save changes" : "Add FAQ Item"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push(BACK)}
        >
          Cancel
        </Button>
        {result && !result.ok && !pending && (
          <p role="alert" className="text-destructive text-sm">
            {result.error}
          </p>
        )}
      </div>
    </form>
  );
}
