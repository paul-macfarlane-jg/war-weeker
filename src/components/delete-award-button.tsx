"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteAward } from "@/actions/awards";
import { Button } from "@/components/ui/button";

export function DeleteAwardButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        startTransition(async () => {
          const result = await deleteAward(id);
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
