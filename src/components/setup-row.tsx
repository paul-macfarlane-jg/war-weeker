// Only client components import this; it holds their shared row plumbing.
import { useRouter } from "next/navigation";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

import type { SetupActionResult } from "@/actions/setup";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { UsageCount } from "@/lib/setup";

/**
 * Runs one setup row's server action, keeps its result, and refreshes the
 * page on success. A refusal shows as an error toast (and stays in the
 * row's `SetupRowError`); a success toasts `successMessage` when given.
 * `onSaved` runs after a successful save (the add row clears its fields
 * there).
 */
export function useSetupRow(onSaved?: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SetupActionResult | null>(null);

  function run(
    action: () => Promise<SetupActionResult>,
    successMessage?: string,
  ) {
    startTransition(async () => {
      const saved = await action();
      setResult(saved);
      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      onSaved?.();
      router.refresh();
    });
  }

  const error = result && !result.ok && !pending ? result.error : null;
  return { pending, run, error };
}

/**
 * A setup row's Save (or Add) and Delete buttons. Delete asks in a
 * `ConfirmDialog` titled `deleteTitle` before calling `onDelete`.
 */
export function SetupRowButtons({
  pending,
  addLabel,
  onDelete,
  deleteTitle,
  deleteDescription,
}: {
  pending: boolean;
  addLabel: string;
  /** Absent on the add row. Runs once the Organizer confirms. */
  onDelete?: () => void;
  /** Names what will be deleted, e.g. "Delete Team Red?". */
  deleteTitle?: string;
  /** What goes with it, e.g. the row's usage counts. */
  deleteDescription?: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Button
        type="submit"
        size="lg"
        className="min-h-11 sm:min-h-9"
        disabled={pending}
      >
        {pending ? "Saving…" : onDelete ? "Save" : addLabel}
      </Button>
      {onDelete && (
        <>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="min-h-11 sm:min-h-9"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            Delete
          </Button>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title={deleteTitle ?? "Delete this row?"}
            description={deleteDescription}
            pending={pending}
            onConfirm={() => {
              setConfirming(false);
              onDelete();
            }}
          />
        </>
      )}
    </div>
  );
}

/** A setup row's server error, under its buttons. */
export function SetupRowError({ error }: { error: string | null }) {
  return <FieldError className="mt-1">{error}</FieldError>;
}

/**
 * "2 Participants · 1 Points Entry", skipping zero counts. (Not
 * `countedParts` from lib/setup, which would pull the seed schema into the
 * client bundle.)
 */
export function usageSummary(counts: UsageCount[]): string {
  const parts = counts
    .filter(([n]) => n > 0)
    .map(([n, singular, plural]) => `${n} ${n === 1 ? singular : plural}`);
  return parts.length > 0 ? parts.join(" · ") : "Not used yet";
}
