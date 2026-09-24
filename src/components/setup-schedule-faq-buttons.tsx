"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  type SetupScheduleFaqActionResult,
  deleteFaqItem,
  deleteScheduleItem,
  moveFaqItem,
} from "@/actions/setup-schedule-faq";
import { Button } from "@/components/ui/button";

/** Runs an action, alerting its refusal, then refreshes the page. */
function useRefreshingAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<SetupScheduleFaqActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) window.alert(result.error);
      router.refresh();
    });
  }
  return { pending, run };
}

export function DeleteScheduleItemButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const { pending, run } = useRefreshingAction();
  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        run(() => deleteScheduleItem(id));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteFaqItemButton({
  id,
  question,
}: {
  id: string;
  question: string;
}) {
  const { pending, run } = useRefreshingAction();
  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete "${question}"?`)) return;
        run(() => deleteFaqItem(id));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

/** Up and down buttons for one FAQ Item; an end's button is disabled. */
export function MoveFaqItemButtons({
  id,
  question,
  first,
  last,
}: {
  id: string;
  question: string;
  first: boolean;
  last: boolean;
}) {
  const { pending, run } = useRefreshingAction();
  return (
    <>
      <Button
        variant="outline"
        size="xs"
        disabled={pending || first}
        aria-label={`Move "${question}" up`}
        onClick={() => run(() => moveFaqItem(id, "up"))}
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="xs"
        disabled={pending || last}
        aria-label={`Move "${question}" down`}
        onClick={() => run(() => moveFaqItem(id, "down"))}
      >
        ↓
      </Button>
    </>
  );
}
