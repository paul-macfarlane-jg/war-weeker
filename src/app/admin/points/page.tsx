import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { DeletePointsEntryButton } from "@/components/delete-points-entry-button";
import { PointsEntryForm } from "@/components/points-entry-form";
import {
  IndividualStandingsList,
  TeamStandingsList,
} from "@/components/standings";
import { formatPoints } from "@/lib/points";
import { formatLedgerTime } from "@/lib/points-entry";
import {
  getAdminLedger,
  getPointsEntryFormOptions,
} from "@/queries/points-entries";
import { getStandings } from "@/queries/standings";

import { loadAdminPage } from "../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Points Entries · JG War Week" };

export default async function AdminPointsPage() {
  const { warWeek, email, isOrganizer, editions } =
    await loadAdminPage("/admin/points");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  const [options, ledger, standings] = await Promise.all([
    getPointsEntryFormOptions(warWeek),
    getAdminLedger(warWeek),
    getStandings(warWeek),
  ]);

  return (
    <AdminShell
      warWeek={warWeek}
      email={email}
      editions={editions}
      current="Points Entries"
    >
      <div className="grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Add a Points Entry</h1>
          <PointsEntryForm options={options} teamLabel={warWeek.teamLabel} />
        </section>

        <section
          className="flex min-w-0 flex-col gap-4"
          aria-label="Admin standings"
        >
          <h2 className="text-lg font-semibold">Current standings</h2>
          <div className="grid gap-6 xl:grid-cols-2">
            {(standings.main === "team" || standings.team.length > 0) && (
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">{warWeek.teamLabel} standings</h3>
                <TeamStandingsList rows={standings.team} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">Individual leaderboard</h3>
              <IndividualStandingsList rows={standings.individual} />
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10 flex flex-col gap-3" aria-label="Ledger">
        <h2 className="text-lg font-semibold">
          Ledger{" "}
          <span className="text-foreground/60 text-sm font-normal">
            ({ledger.length} {ledger.length === 1 ? "entry" : "entries"}, newest
            first)
          </span>
        </h2>
        {ledger.length === 0 ? (
          <p className="text-foreground/70 text-sm">No Points Entries yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-foreground/60 border-border border-b">
                <tr>
                  <th className="py-2 pr-4 font-medium">Competition</th>
                  <th className="py-2 pr-4 font-medium">Awarded to</th>
                  <th className="py-2 pr-4 text-right font-medium">Points</th>
                  <th className="py-2 pr-4 font-medium">Note</th>
                  <th className="py-2 pr-4 font-medium">Entered by</th>
                  <th className="py-2 pr-4 font-medium">Entered at (ET)</th>
                  <th className="py-2 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-border border-b">
                    <td className="py-2 pr-4">{entry.competition}</td>
                    <td className="py-2 pr-4 font-medium">{entry.target}</td>
                    <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                      {formatPoints(entry.points)}
                    </td>
                    <td className="text-foreground/70 py-2 pr-4">
                      {entry.note}
                    </td>
                    <td className="py-2 pr-4">{entry.enteredByEmail}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatLedgerTime(entry.enteredAt)}
                      {entry.editedAt && (
                        <span className="text-foreground/60 block text-xs">
                          edited {formatLedgerTime(entry.editedAt)}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/points/${entry.id}`}
                          className="text-primary text-xs underline-offset-4 hover:underline"
                        >
                          Edit
                        </Link>
                        <DeletePointsEntryButton
                          id={entry.id}
                          description={`${formatPoints(entry.points)} pts to ${entry.target} in ${entry.competition}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
