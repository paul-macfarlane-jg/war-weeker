// Only client components import this; it holds their shared row plumbing.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { SetupActionResult } from "@/actions/setup";
import { Button } from "@/components/ui/button";
import type { UsageCount } from "@/lib/setup";

export const setupFieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

/**
 * Runs one setup row's server action, keeps its result, and refreshes the
 * page on success. `onSaved` runs after a successful save (the add row
 * clears its fields there).
 */
export function useSetupRow(onSaved?: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SetupActionResult | null>(null);

  function run(action: () => Promise<SetupActionResult>) {
    startTransition(async () => {
      const saved = await action();
      setResult(saved);
      if (!saved.ok) return;
      onSaved?.();
      router.refresh();
    });
  }

  const error = result && !result.ok && !pending ? result.error : null;
  return { pending, run, error };
}

/** A setup row's Save (or Add) and Delete buttons. */
export function SetupRowButtons({
  pending,
  addLabel,
  onDelete,
}: {
  pending: boolean;
  addLabel: string;
  /** Absent on the add row. */
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : onDelete ? "Save" : addLabel}
      </Button>
      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          size="lg"
          disabled={pending}
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
    </div>
  );
}

export function SetupRowError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-destructive mt-1 text-sm">
      {error}
    </p>
  );
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
