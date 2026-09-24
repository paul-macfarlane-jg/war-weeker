import type { Metadata } from "next";

import { AdminRefused, AdminShell } from "@/components/admin-shell";

import { loadAdminPage } from "./gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · War Weeker" };

export default async function AdminPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage("/admin");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email}>
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-bold">Organizer overview</h1>
        <p className="text-foreground/70">
          You&apos;re signed in as an Organizer for War Week{" "}
          {warWeek.edition.toUpperCase()} ({warWeek.status}). Standings are{" "}
          {warWeek.standingsHidden ? "hidden" : "visible"} on the public site.
        </p>
        <p className="text-foreground/70">
          Points Entries, standings visibility, Announcements and Awards are
          coming in later slices.
        </p>
      </div>
    </AdminShell>
  );
}
