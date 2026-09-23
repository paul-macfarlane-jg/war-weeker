import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";

import { getWarWeekForEdition } from "./war-week";

const STATUS_LABEL: Record<string, string> = {
  live: "Live now",
  upcoming: "Upcoming",
  complete: "Complete",
};

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
  const statusLabel = STATUS_LABEL[warWeek.status] ?? warWeek.status;

  return (
    <main className="mx-auto flex max-w-md flex-col">
      {warWeek.bannerUrl ? (
        <img
          src={warWeek.bannerUrl}
          alt={`War Week ${editionLabel} banner`}
          className="h-48 w-full object-cover"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-accent text-2xl font-bold text-accent-foreground">
          War Week {editionLabel}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-foreground/60 uppercase">
            War Week
          </span>
          <h1 className="text-3xl font-bold">
            War Week {editionLabel} <span className="text-foreground/60">{warWeek.year}</span>
          </h1>
          <p className="text-xl font-semibold text-primary">{warWeek.storyTheme}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-border px-3 py-1 font-medium">
            {statusLabel}
          </span>
          <span className="text-foreground/70">
            {formatDateRange(warWeek.startDate, warWeek.endDate)}
          </span>
        </div>

        <Button
          size="lg"
          className="w-full"
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
      </div>
    </main>
  );
}
