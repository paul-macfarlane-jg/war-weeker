import { formatPoints } from "@/lib/points";
import type { IndividualStanding, TeamStanding } from "@/lib/standings";

export function StandingsHidden() {
  return (
    <div className="border-border rounded-lg border px-4 py-8 text-center text-lg font-semibold">
      Standings hidden 🔒
    </div>
  );
}

function NoPointsYet() {
  return <p className="text-foreground/70 text-sm">No points yet.</p>;
}

export function TeamStandingsList({ rows }: { rows: TeamStanding[] }) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="border-border flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <span className="text-foreground/60 w-6 text-sm font-medium tabular-nums">
            {row.rank}
          </span>
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="flex-1 font-semibold">{row.name}</span>
          <span className="text-xl font-bold tabular-nums">
            {formatPoints(row.total)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function IndividualStandingsList({
  rows,
}: {
  rows: IndividualStanding[];
}) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row) => {
        const { team } = row;
        return (
          <li
            key={row.id}
            className="border-border flex items-center gap-3 border-b px-2 py-2 last:border-b-0"
          >
            <span className="text-foreground/60 w-6 text-sm font-medium tabular-nums">
              {row.rank}
            </span>
            <span className="flex-1">
              {row.name}
              {team ? (
                <span
                  className="ml-2 text-xs font-medium"
                  style={{ color: team.color }}
                >
                  {team.name}
                </span>
              ) : null}
            </span>
            <span className="font-semibold tabular-nums">
              {formatPoints(row.total)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
