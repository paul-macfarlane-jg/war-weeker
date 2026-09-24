"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deletePointsEntry } from "@/actions/points-entries";
import { Button } from "@/components/ui/button";

export function DeletePointsEntryButton({
  id,
  description,
}: {
  id: string;
  /** e.g. "5 pts to Red in Tug of War", for the confirm prompt. */
  description: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete ${description}?`)) return;
        startTransition(async () => {
          const result = await deletePointsEntry(id);
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
