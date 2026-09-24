import { Avatar } from "@/components/avatar";
import { YouTag } from "@/components/you";
import { formatPoints } from "@/lib/points";
import { type RowReveal, countUpTotal } from "@/lib/reveal";
import type { IndividualStanding, TeamStanding } from "@/lib/standings";
import { YOU_ROW_CLASS } from "@/lib/you";

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

/**
 * A row's classes and shown total during the Reveal (`reveal` is the row's
 * state, or undefined when no Reveal is playing). Rows not yet revealed
 * stay in place but invisible, so the list doesn't jump.
 */
function revealed(total: number, reveal: RowReveal | undefined) {
  if (!reveal) return { className: "", total };
  return {
    className: reveal.shown
      ? "translate-y-0 opacity-100 transition-all duration-500"
      : "translate-y-2 opacity-0",
    total: countUpTotal(total, reveal.progress),
  };
}

export function TeamStandingsList({
  rows,
  reveal,
}: {
  rows: TeamStanding[];
  /** Each row's Reveal state, in row order, while the Reveal plays. */
  reveal?: RowReveal[];
}) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const shown = revealed(row.total, reveal?.[i]);
        return (
          <li
            key={row.id}
            className={`border-border flex items-center gap-3 rounded-lg border px-4 py-3 ${shown.className}`}
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
              {formatPoints(shown.total)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function IndividualStandingsList({
  rows,
  reveal,
  primaryColor,
}: {
  rows: IndividualStanding[];
  /** Each row's Reveal state, in row order, while the Reveal plays. */
  reveal?: RowReveal[];
  /**
   * The Appearance Theme primary color. When given, each row shows the
   * Participant's Avatar (admin omits it).
   */
  primaryColor?: string;
}) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row, i) => {
        const { team } = row;
        const shown = revealed(row.total, reveal?.[i]);
        return (
          <li
            key={row.id}
            className={`border-border flex items-center gap-3 border-b px-2 py-2 last:border-b-0 ${YOU_ROW_CLASS} ${shown.className}`}
          >
            <span className="text-foreground/60 w-6 text-sm font-medium tabular-nums">
              {row.rank}
            </span>
            {primaryColor ? (
              <Avatar
                name={row.name}
                teamColor={team?.color ?? null}
                primaryColor={primaryColor}
              />
            ) : null}
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
            <YouTag participantId={row.id} />
            <span className="font-semibold tabular-nums">
              {formatPoints(shown.total)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
