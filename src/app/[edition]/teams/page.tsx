import { notFound } from "next/navigation";

import { RosterList, TeamRoster } from "@/components/roster";
import { getRoster } from "@/queries/roster";

import { getWarWeekForEdition } from "../war-week";

export default async function TeamsPage({
  params,
}: PageProps<"/[edition]/teams">) {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const roster = await getRoster(warWeek);
  const { teamLabel, leaderTitle } = warWeek;

  if (roster.kind === "free-for-all") {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Participants</h1>
        <p className="text-foreground/70 text-sm">
          Free-for-all: everyone competes on their own.
        </p>
        <RosterList
          participants={roster.participants}
          leaderTitle={leaderTitle}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{teamLabel}s</h1>
      {roster.teams.length === 0 ? (
        <p className="text-foreground/70 text-sm">No {teamLabel}s yet.</p>
      ) : null}
      {roster.teams.map((team) => (
        <TeamRoster
          key={team.id}
          team={team}
          teamLabel={teamLabel}
          leaderTitle={leaderTitle}
        />
      ))}
      {roster.unassigned.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Not on a {teamLabel} yet</h2>
          <RosterList
            participants={roster.unassigned}
            leaderTitle={leaderTitle}
          />
        </section>
      ) : null}
    </main>
  );
}
