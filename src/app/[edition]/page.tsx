import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import {
  IndividualStandingsList,
  StandingsHidden,
  TeamStandingsList,
} from "@/components/standings";
import { Button } from "@/components/ui/button";
import type { WarWeek } from "@/db/schema";
import { getStandings } from "@/queries/standings";

import { getWarWeekForEdition } from "./war-week";

const STATUS_LABEL: Record<WarWeek["status"], string> = {
  live: "Live now",
  upcoming: "Upcoming",
  complete: "Complete",
};

const HOME_INDIVIDUAL_ROWS = 5;

function formatDateRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const yearFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
  const start = formatter.format(new Date(startDate));
  const end = formatter.format(new Date(endDate));
  const year = yearFormatter.format(new Date(endDate));
  return `${start} – ${end}, ${year}`;
}

export default async function EditionHomePage({
  params,
}: PageProps<"/[edition]">) {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const editionLabel = warWeek.edition.toUpperCase();
  const statusLabel = STATUS_LABEL[warWeek.status];
  const standings = await getStandings(warWeek);

  return (
    <main className="mx-auto flex max-w-md flex-col">
      {warWeek.bannerUrl ? (
        <img
          src={warWeek.bannerUrl}
          alt={`War Week ${editionLabel} banner`}
          className="h-48 w-full object-cover"
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
          className="w-full"
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
