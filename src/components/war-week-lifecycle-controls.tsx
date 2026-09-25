"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  endWarWeek,
  reopenWarWeek,
  startWarWeek,
} from "@/actions/war-week-lifecycle";
import {
  ConfirmActionButton,
  ConfirmDialog,
} from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WarWeek } from "@/db/schema";

/**
 * The lifecycle action for a War Week's status, behind a confirm that says
 * what changes: Start (`upcoming`), End with the Winner and highlights
 * (`live`) or Reopen (`complete`).
 */
export function WarWeekLifecycleControls({
  warWeekId,
  edition,
  status,
  suggestedWinner,
  highlights,
}: {
  warWeekId: string;
  edition: string;
  status: WarWeek["status"];
  /** First place in the main Standings, to prefill the Winner. */
  suggestedWinner: string;
  highlights: string[];
}) {
  const name = edition.toUpperCase();

  if (status === "upcoming") {
    return (
      <ConfirmActionButton
        title={`Start War Week ${name}?`}
        description={`${name} goes live. It becomes the current War Week.`}
        confirmLabel="Start War Week"
        variant="default"
        size="lg"
        className="min-h-11 self-start sm:min-h-9"
        successMessage={`War Week ${name} is live`}
        action={() => startWarWeek(warWeekId)}
      >
        Start War Week
      </ConfirmActionButton>
    );
  }

  if (status === "complete") {
    return (
      <ConfirmActionButton
        title={`Reopen War Week ${name}?`}
        description={`${name} goes live again for corrections and becomes the current War Week until you end it.`}
        confirmLabel="Reopen"
        variant="outline"
        size="lg"
        className="min-h-11 self-start sm:min-h-9"
        successMessage={`War Week ${name} is live again`}
        action={() => reopenWarWeek(warWeekId)}
      >
        Reopen
      </ConfirmActionButton>
    );
  }

  return (
    <EndWarWeekButton
      warWeekId={warWeekId}
      name={name}
      suggestedWinner={suggestedWinner}
      highlights={highlights}
    />
  );
}

function EndWarWeekButton({
  warWeekId,
  name,
  suggestedWinner,
  highlights: initialHighlights,
}: {
  warWeekId: string;
  name: string;
  suggestedWinner: string;
  highlights: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [winner, setWinner] = useState(suggestedWinner);
  const [highlights, setHighlights] = useState(initialHighlights.join("\n"));

  function confirm() {
    startTransition(async () => {
      const result = await endWarWeek(warWeekId, { winner, highlights });
      if (result.ok) {
        toast.success(`War Week ${name} is in the Archive`);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
      router.refresh();
    });
  }

  const trimmed = winner.trim();
  return (
    <>
      <Button
        type="button"
        size="lg"
        className="min-h-11 self-start sm:min-h-9"
        onClick={() => setOpen(true)}
      >
        End War Week
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`End War Week ${name}?`}
        description={
          trimmed
            ? `${name} moves to the Archive with ${trimmed} as Winner.`
            : `${name} moves to the Archive with no Winner.`
        }
        confirmLabel="End War Week"
        pending={pending}
        onConfirm={confirm}
      >
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="end-winner">Winner</FieldLabel>
            <Input
              id="end-winner"
              name="winner"
              className="h-11 sm:h-9"
              maxLength={200}
              value={winner}
              onChange={(event) => setWinner(event.target.value)}
            />
            <FieldDescription>
              First place in the Standings. A tie can be &ldquo;Red &amp;
              Blue&rdquo;.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="end-highlights">Highlights</FieldLabel>
            <Textarea
              id="end-highlights"
              name="highlights"
              rows={3}
              value={highlights}
              onChange={(event) => setHighlights(event.target.value)}
            />
            <FieldDescription>Optional. One short line each.</FieldDescription>
          </Field>
        </FieldGroup>
      </ConfirmDialog>
    </>
  );
}
