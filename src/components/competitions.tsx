import Link from "next/link";

import {
  type LedgerEntry,
  describeScoring,
  formatMaxPoints,
} from "@/lib/competitions";
import { formatPoints } from "@/lib/points";
import type { CompetitionListItem } from "@/queries/competitions";

export function CompetitionFacts({
  competition,
  teamLabel,
}: {
  competition: CompetitionListItem;
  teamLabel: string;
}) {
  return (
    <div className="text-foreground/70 flex flex-wrap gap-x-3 gap-y-1 text-sm">
      <span className="font-medium tabular-nums">
        {formatMaxPoints(competition.maxPoints)}
      </span>
      <span>{describeScoring(competition, teamLabel)}</span>
    </div>
  );
}

export function CompetitionList({
  competitions,
  edition,
  teamLabel,
}: {
  competitions: CompetitionListItem[];
  edition: string;
  teamLabel: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {competitions.map((competition) => (
        <li key={competition.id}>
          <Link
            href={`/${edition}/competitions/${competition.id}`}
            className="border-border hover:border-primary flex flex-col gap-1 rounded-lg border px-4 py-3"
          >
            <span className="font-semibold">{competition.name}</span>
            <CompetitionFacts competition={competition} teamLabel={teamLabel} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PointsHidden() {
  return (
    <div className="border-border rounded-lg border px-4 py-6 text-center">
      <p className="font-semibold">Points hidden 🔒</p>
      <p className="text-foreground/70 mt-1 text-sm">
        Points Entries stay hidden until closing ceremonies.
      </p>
    </div>
  );
}

export function PointsEntryList({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-foreground/70 text-sm">No points yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {entries.map(({ id, target, points, note }) => (
        <li
          key={id}
          className="border-border flex items-start gap-3 border-b px-2 py-2 last:border-b-0"
        >
          <span
            aria-hidden
            className="mt-1.5 size-3 shrink-0 rounded-full"
            style={{ backgroundColor: target.color ?? "transparent" }}
          />
          <span className="flex flex-1 flex-col">
            <span>
              <span className="font-medium">{target.name}</span>
              {target.team ? (
                <span
                  className="ml-2 text-xs font-medium"
                  style={{ color: target.color ?? undefined }}
                >
                  {target.team}
                </span>
              ) : null}
            </span>
            {note ? (
              <span className="text-foreground/70 text-sm">{note}</span>
            ) : null}
          </span>
          <span className="font-semibold tabular-nums">
            {formatPoints(points)}
          </span>
        </li>
      ))}
    </ul>
  );
}
