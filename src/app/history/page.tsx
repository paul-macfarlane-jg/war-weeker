import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ArchiveCard } from "@/components/archive";
import { listArchive } from "@/queries/archive";
import { getCurrentWarWeek } from "@/queries/war-weeks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "History · War Weeker" };

/** The Archive: every past War Week, newest first, each in its own theme. */
export default async function HistoryPage() {
  const [warWeeks, current] = await Promise.all([
    listArchive(),
    getCurrentWarWeek(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 md:max-w-5xl md:py-10">
      {current ? (
        <Link
          href={`/${current.edition}`}
          className="text-foreground/70 flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to War Week {current.edition.toUpperCase()}
        </Link>
      ) : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">War Week history</h1>
        <p className="text-foreground/70">Every past War Week, newest first.</p>
      </div>
      {warWeeks.length === 0 ? (
        <p className="text-foreground/70 text-sm">No past War Weeks yet.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {warWeeks.map((warWeek) => (
            <ArchiveCard key={warWeek.id} warWeek={warWeek} />
          ))}
        </ul>
      )}
    </main>
  );
}
