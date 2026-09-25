import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui/card";
import { YouTag } from "@/components/you";
import { type RowFinale, countUpTotal } from "@/lib/finale";
import { formatPoints } from "@/lib/points";
import type {
  IndividualStanding,
  Standings,
  TeamStanding,
} from "@/lib/standings";
import { YOU_ROW_CLASS } from "@/lib/you";

function NoPointsYet() {
  return <p className="text-foreground/70 text-sm">No points yet.</p>;
}

/**
 * A row's classes and shown total during the Finale (`finale` is the row's
 * state, or undefined when no Finale is playing). Rows not yet shown stay
 * in place but invisible, so the list doesn't jump.
 */
function finaleRow(total: number, finale: RowFinale | undefined) {
  if (!finale) return { className: "", total };
  return {
    className: finale.shown
      ? "translate-y-0 opacity-100 transition-all duration-500"
      : "translate-y-2 opacity-0",
    total: countUpTotal(total, finale.progress),
  };
}

export function TeamStandingsList({
  rows,
  finale,
}: {
  rows: TeamStanding[];
  /** Each row's Finale state, in row order, while the Finale plays. */
  finale?: RowFinale[];
}) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const shown = finaleRow(row.total, finale?.[i]);
        return (
          <li key={row.id} className={shown.className || undefined}>
            <Card size="sm" className="flex-row items-center gap-3 px-4 py-3">
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
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

export function IndividualStandingsList({
  rows,
  finale,
  primaryColor,
}: {
  rows: IndividualStanding[];
  /** Each row's Finale state, in row order, while the Finale plays. */
  finale?: RowFinale[];
  /**
   * The Appearance Theme primary color. When given, each row shows the
   * Participant's Avatar (admin omits it).
   */
  primaryColor?: string;
}) {
  if (rows.length === 0) return <NoPointsYet />;

  return (
    <Card size="sm" className="py-1">
      <ol className="flex flex-col divide-y px-(--card-spacing)">
        {rows.map((row, i) => {
          const { team } = row;
          const shown = finaleRow(row.total, finale?.[i]);
          return (
            <li
              key={row.id}
              className={`flex items-center gap-3 px-2 py-2 ${YOU_ROW_CLASS} ${shown.className}`}
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
    </Card>
  );
}

/** The home page's main leaderboard. */
export function HomeStandings({
  standings,
  individualLimit,
  primaryColor,
}: {
  standings: Standings;
  /** How many individual rows the home page shows. */
  individualLimit: number;
  /** The Appearance Theme primary color, for Avatars with no Team. */
  primaryColor: string;
}) {
  return standings.main === "team" ? (
    <TeamStandingsList rows={standings.team} />
  ) : (
    <IndividualStandingsList
      rows={standings.individual.slice(0, individualLimit)}
      primaryColor={primaryColor}
    />
  );
}

/** Both leaderboards, the main one first. */
export function LeaderboardStandings({
  standings,
  teamLabel,
  primaryColor,
}: {
  standings: Standings;
  teamLabel: string;
  /** The Appearance Theme primary color, for Avatars with no Team. */
  primaryColor: string;
}) {
  const teamSection = (
    <StandingsSection key="team" title={`${teamLabel} standings`}>
      <TeamStandingsList rows={standings.team} />
    </StandingsSection>
  );
  const individualSection = (
    <StandingsSection key="individual" title="Individual leaderboard">
      <IndividualStandingsList
        rows={standings.individual}
        primaryColor={primaryColor}
      />
    </StandingsSection>
  );
  // A free-for-all War Week has no Teams, so it shows no team section.
  const sections =
    standings.main === "team"
      ? [teamSection, individualSection]
      : [
          individualSection,
          ...(standings.team.length > 0 ? [teamSection] : []),
        ];

  return <div className="flex flex-col gap-6">{sections}</div>;
}

function StandingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
