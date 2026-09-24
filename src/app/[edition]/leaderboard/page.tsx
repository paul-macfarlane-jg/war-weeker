import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import {
  IndividualStandingsList,
  StandingsHidden,
  TeamStandingsList,
} from "@/components/standings";
import { getStandings } from "@/queries/standings";

import { getWarWeekForEdition } from "../war-week";

export default async function LeaderboardPage({
  params,
}: PageProps<"/[edition]/leaderboard">) {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const standings = await getStandings(warWeek);

  if (standings.hidden) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 md:max-w-3xl">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <StandingsHidden />
        <AutoRefresh />
      </main>
    );
  }

  const teamSection = (
    <section key="team" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{warWeek.teamLabel} standings</h2>
      <TeamStandingsList rows={standings.team} />
    </section>
  );
  const individualSection = (
    <section key="individual" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Individual leaderboard</h2>
      <IndividualStandingsList rows={standings.individual} />
    </section>
  );
  // A free-for-all War Week has no Teams, so it shows no team section.
  const sections =
    standings.main === "team"
      ? [teamSection, individualSection]
      : [
          individualSection,
          ...(standings.team.length > 0 ? [teamSection] : []),
        ];

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-6 md:max-w-3xl">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      {sections}
      <AutoRefresh />
    </main>
  );
}
