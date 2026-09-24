import { ArrowLeft, ExternalLink, Trophy } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { WarWeekHero } from "@/components/war-week-hero";
import type { WarWeek } from "@/db/schema";
import { type ArchiveDetail, awardRecipients, isLinkOnly } from "@/lib/archive";
import { warWeekThemeStyle } from "@/lib/theme";
import { formatDateRange } from "@/lib/war-week-display";

function WikiLink({ wikiUrl }: { wikiUrl: string | null }) {
  if (!wikiUrl) return null;
  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full md:w-auto md:self-start"
      nativeButton={false}
      render={<a href={wikiUrl} target="_blank" rel="noreferrer" />}
    >
      Original wiki page
      <ExternalLink aria-hidden className="size-4" />
    </Button>
  );
}

function Highlights({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Highlights</h2>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A past War Week at its edition URL, in its own Appearance Theme (the
 * `[edition]` layout applies it). Sparse early years render as a link-only
 * card in the same layout.
 */
export function ArchiveDetailView({ detail }: { detail: ArchiveDetail }) {
  const { warWeek, teams, awards } = detail;
  const linkOnly = isLinkOnly(detail);

  return (
    <main className="mx-auto flex max-w-md flex-col md:max-w-3xl md:py-8">
      <WarWeekHero warWeek={warWeek} />

      <div className="flex flex-col gap-6 px-4 pt-4 pb-6">
        <Link
          href="/history"
          className="text-primary flex items-center gap-1 text-sm font-medium"
        >
          <ArrowLeft aria-hidden className="size-4" />
          All past War Weeks
        </Link>

        {linkOnly ? (
          <section className="border-border flex flex-col gap-4 rounded-lg border px-4 py-4">
            <p className="text-foreground/80 text-sm">
              The story of War Week {warWeek.edition.toUpperCase()} lives on the
              original wiki page.
            </p>
            <Highlights highlights={warWeek.highlights} />
            <WikiLink wikiUrl={warWeek.wikiUrl} />
          </section>
        ) : (
          <>
            {warWeek.winner ? (
              <section className="bg-primary text-primary-foreground flex items-center gap-3 rounded-lg px-4 py-4">
                <Trophy aria-hidden className="size-8 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium tracking-wide uppercase opacity-80">
                    Winner
                  </span>
                  <span className="text-xl font-bold">{warWeek.winner}</span>
                </div>
              </section>
            ) : null}

            {teams.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{warWeek.teamLabel}s</h2>
                <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {teams.map((team) => (
                    <li
                      key={team.name}
                      className="border-border flex items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      <span
                        aria-hidden
                        className="size-4 shrink-0 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <span className="font-medium">{team.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <Highlights highlights={warWeek.highlights} />

            {awards.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">Awards</h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {awards.map((award) => {
                    const recipients = awardRecipients(award);
                    return (
                      <li
                        key={award.name}
                        className="border-border flex flex-col gap-1 rounded-lg border px-3 py-2"
                      >
                        <span className="font-semibold">{award.name}</span>
                        {recipients ? (
                          <span className="text-primary text-sm font-medium">
                            {recipients}
                          </span>
                        ) : null}
                        {award.description ? (
                          <span className="text-foreground/70 text-sm">
                            {award.description}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <WikiLink wikiUrl={warWeek.wikiUrl} />
          </>
        )}
      </div>
    </main>
  );
}

/** One past War Week on `/history`, dressed in its own Appearance Theme. */
export function ArchiveCard({ warWeek }: { warWeek: WarWeek }) {
  const editionLabel = warWeek.edition.toUpperCase();

  return (
    <li
      style={warWeekThemeStyle(warWeek)}
      className="bg-background text-foreground border-border border-t-primary flex flex-col overflow-hidden rounded-lg border border-t-8 font-sans"
    >
      <Link
        href={`/${warWeek.edition}`}
        className="flex flex-1 flex-col gap-1 px-4 py-3"
      >
        <span className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          War Week {editionLabel} · {warWeek.year}
        </span>
        <span className="text-primary text-lg font-semibold">
          {warWeek.storyTheme}
        </span>
        <span className="text-foreground/70 text-sm">
          {formatDateRange(warWeek.startDate, warWeek.endDate)}
        </span>
        <span className="text-sm">
          {warWeek.winner ? (
            <>
              <span className="text-foreground/60">Winner: </span>
              <span className="font-medium">{warWeek.winner}</span>
            </>
          ) : (
            <span className="text-foreground/60">
              Details on the original wiki page
            </span>
          )}
        </span>
      </Link>
      {warWeek.wikiUrl ? (
        <a
          href={warWeek.wikiUrl}
          target="_blank"
          rel="noreferrer"
          className="border-border text-primary flex items-center gap-1 border-t px-4 py-2 text-xs font-medium"
        >
          Original wiki page
          <ExternalLink aria-hidden className="size-3" />
        </a>
      ) : null}
    </li>
  );
}
