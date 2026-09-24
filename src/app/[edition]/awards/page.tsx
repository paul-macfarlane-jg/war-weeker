import { Medal } from "lucide-react";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/avatar";
import { getAwards } from "@/queries/awards";

import { getWarWeekForEdition } from "../war-week";

export default async function AwardsPage({
  params,
}: PageProps<"/[edition]/awards">) {
  const { edition } = await params;
  const warWeek = await getWarWeekForEdition(edition);
  if (!warWeek) notFound();

  const awards = await getAwards(warWeek);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 md:max-w-3xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Awards</h1>
        <p className="text-foreground/70 text-sm">
          Honors for this War Week. Awards don&apos;t add points to the
          Standings.
        </p>
      </div>
      {awards.length === 0 ? (
        <p className="text-foreground/70 text-sm">No Awards yet.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {awards.map((award) => (
            <li
              key={award.id}
              className="border-border flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <Medal aria-hidden className="text-primary size-5 shrink-0" />
                <h2 className="text-lg font-semibold">{award.name}</h2>
              </div>
              {award.team ? (
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: award.team.color }}
                  />
                  {award.team.name}
                </p>
              ) : null}
              {award.participants.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {award.participants.map((p) => (
                    <li
                      key={p.id}
                      className="text-primary flex items-center gap-2 text-sm font-medium"
                    >
                      <Avatar
                        name={p.displayName}
                        teamColor={p.teamColor}
                        primaryColor={warWeek.primaryColor}
                      />
                      {p.displayName}
                    </li>
                  ))}
                </ul>
              ) : null}
              {award.description ? (
                <p className="text-foreground/70 text-sm">
                  {award.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
