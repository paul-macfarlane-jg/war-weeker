"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { hideStandings, revealStandings } from "@/actions/standings-visibility";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";

/** The Hide or Reveal button for the current War Week's Standings. */
export function StandingsVisibilityControls({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const run = (action: typeof hideStandings, successMessage: string) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(successMessage);
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {hidden ? (
        <>
          <Button size="lg" disabled={pending} onClick={() => setOpen(true)}>
            {pending ? "Revealing…" : "Reveal"}
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Reveal the Standings?"
            description="Every open home and leaderboard page plays the Reveal on its next refresh."
            confirmLabel="Reveal"
            pending={pending}
            onConfirm={() => run(revealStandings, "Standings revealed")}
          />
        </>
      ) : (
        <>
          <Button
            size="lg"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(true)}
          >
            {pending ? "Hiding…" : "Hide standings"}
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Hide the Standings?"
            description="Hides them from Participants and from Claude."
            confirmLabel="Hide"
            pending={pending}
            onConfirm={() => run(hideStandings, "Standings hidden")}
          />
        </>
      )}
    </div>
  );
}
