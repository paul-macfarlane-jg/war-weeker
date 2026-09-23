import type { RosterParticipant, RosterTeam } from "@/lib/roster";

export function RosterList({
  participants,
  leaderTitle,
}: {
  participants: RosterParticipant[];
  leaderTitle: string;
}) {
  if (participants.length === 0) {
    return <p className="text-foreground/70 text-sm">No Participants yet.</p>;
  }

  return (
    <ul className="flex flex-col">
      {participants.map((p) => (
        <li
          key={p.id}
          className="border-border flex flex-wrap items-center gap-2 border-b px-2 py-2 last:border-b-0"
        >
          <span className={p.isLeader ? "font-semibold" : undefined}>
            {p.displayName}
          </span>
          {p.isLeader ? (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              {leaderTitle}
            </span>
          ) : null}
          {p.companyTag ? (
            <span className="border-border text-foreground/70 rounded-full border px-2 py-0.5 text-xs">
              {p.companyTag}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function TeamRoster({
  team,
  teamLabel,
  leaderTitle,
}: {
  team: RosterTeam;
  teamLabel: string;
  leaderTitle: string;
}) {
  return (
    <section
      className="border-border flex flex-col gap-3 rounded-lg border border-t-4 px-4 py-3"
      style={{ borderTopColor: team.color }}
    >
      <div className="flex items-center gap-3">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={`${team.name} logo`}
            className="size-10 rounded object-contain"
          />
        ) : (
          <span
            aria-hidden
            className="size-4 shrink-0 rounded-full"
            style={{ backgroundColor: team.color }}
          />
        )}
        <h2 className="flex-1 text-lg font-semibold">
          <span className="text-foreground/60 mr-1 text-sm font-medium">
            {teamLabel}
          </span>
          {team.name}
        </h2>
        <span className="text-foreground/60 text-sm tabular-nums">
          {team.participants.length}
        </span>
      </div>
      <RosterList participants={team.participants} leaderTitle={leaderTitle} />
    </section>
  );
}
