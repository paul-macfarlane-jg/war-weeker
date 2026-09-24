import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import {
  CompetitionFacts,
  PointsEntryList,
  PointsHidden,
} from "@/components/competitions";
import { getCompetitionWithLedger } from "@/queries/competitions";

import { getWarWeekForEdition } from "../../war-week";

export default async function CompetitionPage({
  params,
}: PageProps<"/[edition]/competitions/[id]">) {
  const { edition, id } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const found = await getCompetitionWithLedger(warWeek, id);
  if (!found) notFound();
  const { competition, ledger } = found;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl">
      <Link
        href={`/${warWeek.edition}/competitions`}
        className="text-primary inline-flex items-center gap-1 text-sm font-medium"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Competitions
      </Link>
      <div className="flex flex-col gap-2">
        {competition.competitionGroup ? (
          <span className="text-foreground/60 text-sm">
            {competition.competitionGroup}
          </span>
        ) : null}
        <h1 className="text-2xl font-bold">{competition.name}</h1>
        <CompetitionFacts
          competition={competition}
          teamLabel={warWeek.teamLabel}
        />
      </div>
      {competition.description ? (
        <p className="text-sm whitespace-pre-line">{competition.description}</p>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Points Entries</h2>
        {ledger.hidden ? (
          <PointsHidden />
        ) : (
          <PointsEntryList entries={ledger.entries} />
        )}
      </section>
      <AutoRefresh />
    </main>
  );
}
