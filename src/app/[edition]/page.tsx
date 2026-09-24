import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { NowNextSection } from "@/components/now-next";
import {
  IndividualStandingsList,
  StandingsHidden,
  TeamStandingsList,
} from "@/components/standings";
import { Button } from "@/components/ui/button";
import { computeNowNext, resolveClock } from "@/lib/schedule";
import { WAR_WEEK_STATUS_LABEL, formatDateRange } from "@/lib/war-week-display";
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

  const editionLabel = warWeek.edition.toUpperCase();
  const statusLabel = WAR_WEEK_STATUS_LABEL[warWeek.status];
  const [standings, schedule] = await Promise.all([
    getStandings(warWeek),
    getSchedule(warWeek.id),
  ]);
  const nowNext = computeNowNext(schedule, resolveClock(at));

  return (
    <main className="mx-auto flex max-w-md flex-col md:max-w-3xl md:py-8">
      {warWeek.bannerUrl ? (
        <img
          src={warWeek.bannerUrl}
          alt={`War Week ${editionLabel} banner`}
          className="h-48 w-full object-cover md:h-72 md:rounded-lg"
        />
      ) : (
        <div className="bg-accent text-accent-foreground flex h-48 w-full items-center justify-center text-2xl font-bold">
          War Week {editionLabel}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="flex items-start gap-3">
          {warWeek.logoUrl ? (
            <img
              src={warWeek.logoUrl}
              alt={`War Week ${editionLabel} logo`}
              className="size-14 shrink-0 rounded-md"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
              War Week
            </span>
            <h1 className="text-3xl font-bold">
              War Week {editionLabel}{" "}
              <span className="text-foreground/60">{warWeek.year}</span>
            </h1>
            <p className="text-primary text-xl font-semibold">
              {warWeek.storyTheme}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="border-border rounded-full border px-3 py-1 font-medium">
            {statusLabel}
          </span>
          <span className="text-foreground/70">
            {formatDateRange(warWeek.startDate, warWeek.endDate)}
          </span>
        </div>

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
          {standings.hidden ? (
            <StandingsHidden />
          ) : standings.main === "team" ? (
            <TeamStandingsList rows={standings.team} />
          ) : (
            <IndividualStandingsList
              rows={standings.individual.slice(0, HOME_INDIVIDUAL_ROWS)}
            />
          )}
        </section>
      </div>
      <AutoRefresh />
    </main>
  );
}
