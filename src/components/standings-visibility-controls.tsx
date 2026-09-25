"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { hideStandings, revealStandings } from "@/actions/standings-visibility";
import { Button } from "@/components/ui/button";

/** The Hide or Reveal button for the current War Week's Standings. */
export function StandingsVisibilityControls({ hidden }: { hidden: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: typeof hideStandings, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {hidden ? (
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            run(
              revealStandings,
              "Reveal the Standings? Every open home and leaderboard page plays the Reveal on its next refresh.",
            )
          }
        >
          {pending ? "Revealing…" : "Reveal"}
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              hideStandings,
              "Hide the Standings from Participants and from Claude?",
            )
          }
        >
          {pending ? "Hiding…" : "Hide standings"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
