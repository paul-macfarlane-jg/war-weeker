"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { selectAdminEdition } from "@/actions/war-week-lifecycle";
import { OptionSelect } from "@/components/option-select";
import type { AdminEdition } from "@/lib/access";
import { STATUS_LABELS } from "@/lib/war-week-lifecycle";

/**
 * The admin header's edition switcher: which War Week `/admin` works on.
 * The server re-checks the choice on every page and action.
 */
export function AdminEditionSwitcher({
  editions,
  selected,
}: {
  editions: AdminEdition[];
  selected: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const options = editions.map((e) => ({
    value: e.edition,
    label: `War Week ${e.edition.toUpperCase()} · ${
      e.current ? "Current" : STATUS_LABELS[e.status]
    }`,
  }));

  return (
    <span className="w-56 max-w-full">
      <OptionSelect
        aria-label="War Week to administer"
        options={options}
        value={selected}
        disabled={pending}
        onValueChange={(edition) =>
          startTransition(async () => {
            const result = await selectAdminEdition(edition);
            if (!result.ok) toast.error(result.error);
            router.refresh();
          })
        }
      />
    </span>
  );
}
