import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { StandingsVisibilityControls } from "@/components/standings-visibility-controls";

import { loadAdminPage } from "../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Standings visibility · War Weeker",
};

export default async function AdminStandingsPage() {
  const { warWeek, email, isOrganizer } =
    await loadAdminPage("/admin/standings");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  const hidden = warWeek.standingsHidden;
  const edition = warWeek.edition;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Standings visibility">
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-bold">Standings visibility</h1>
        <p className="text-lg font-semibold">
          {hidden
            ? "Standings are hidden 🔒"
            : "Standings are visible on the public site"}
        </p>
        <p className="text-foreground/70">
          {hidden ? (
            <>
              The home page, leaderboard, Competition pages and Claude show
              &ldquo;hidden&rdquo; and no numbers. Press Reveal at closing
              ceremonies: every open{" "}
              <Link
                href={`/${edition}`}
                className="text-primary underline underline-offset-4"
              >
                home
              </Link>{" "}
              and{" "}
              <Link
                href={`/${edition}/leaderboard`}
                className="text-primary underline underline-offset-4"
              >
                leaderboard
              </Link>{" "}
              page, on the projector and on phones, plays the Reveal within
              about 10 seconds.
            </>
          ) : (
            <>
              Everyone sees the Standings, and Claude answers with them. Hide
              them again to keep the final days a secret; pressing Reveal later
              plays the animation again.
            </>
          )}
        </p>
        <StandingsVisibilityControls hidden={hidden} />
        <p className="text-foreground/70 text-sm">
          <Link
            href="/admin/points"
            className="text-primary underline underline-offset-4"
          >
            Points Entries
          </Link>{" "}
          always shows the real Standings to Organizers.
        </p>
      </div>
    </AdminShell>
  );
}
