import Link from "next/link";
import { notFound } from "next/navigation";

import { ArchiveDetailView } from "@/components/archive";
import { AutoRefresh } from "@/components/auto-refresh";
import { NowNextSection } from "@/components/now-next";
import { HomeStandings } from "@/components/reveal-standings";
import { Button } from "@/components/ui/button";
import { WarWeekHero } from "@/components/war-week-hero";
import { computeNowNext, resolveClock } from "@/lib/schedule";
import { getArchiveDetail } from "@/queries/archive";
import { getSchedule } from "@/queries/schedule";
import { getStandings } from "@/queries/standings";

import { getWarWeekForEdition } from "./war-week";

const HOME_INDIVIDUAL_ROWS = 5;

export default async function EditionHomePage({
  params,
  searchParams,
}: PageProps<"/[edition]">) {
  const { edition } = await params;
  const { at } = await searchParams;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  if (warWeek.status === "complete") {
    return <ArchiveDetailView detail={await getArchiveDetail(warWeek)} />;
  }

  const [standings, schedule] = await Promise.all([
    getStandings(warWeek),
    getSchedule(warWeek.id),
  ]);
  const nowNext = computeNowNext(schedule, resolveClock(at));

  return (
    <main className="mx-auto flex max-w-md flex-col md:max-w-3xl md:py-8">
      <WarWeekHero warWeek={warWeek} />

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
        <Button
          size="lg"
          className="w-full md:w-auto md:self-start"
          nativeButton={false}
          render={
            <a
              href={warWeek.slackChannelUrl}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Join the Slack channel
        </Button>

        <NowNextSection nowNext={nowNext} edition={warWeek.edition} />

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">
              {warWeek.mode === "teams"
                ? `${warWeek.teamLabel} standings`
                : "Individual leaderboard"}
            </h2>
            <Link
              href={`/${warWeek.edition}/leaderboard`}
              className="text-primary text-sm font-medium"
            >
              Full leaderboard
            </Link>
          </div>
          <HomeStandings
            standings={standings}
            individualLimit={HOME_INDIVIDUAL_ROWS}
          />
        </section>
      </div>
      <AutoRefresh />
    </main>
  );
}
