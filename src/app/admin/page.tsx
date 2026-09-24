import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";

import { loadAdminPage } from "./gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin · War Weeker" };

export default async function AdminPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage("/admin");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Overview">
      <div className="flex max-w-2xl flex-col gap-3">
        <h1 className="text-2xl font-bold">Organizer overview</h1>
        <p className="text-foreground/70">
          You&apos;re signed in as an Organizer for War Week{" "}
          {warWeek.edition.toUpperCase()} ({warWeek.status}). Standings are{" "}
          {warWeek.standingsHidden ? "hidden" : "visible"} on the public site.
        </p>
        <p className="text-foreground/70">
          <Link
            href="/admin/points"
            className="text-primary underline underline-offset-4"
          >
            Enter points
          </Link>{" "}
          and see the current standings,{" "}
          <Link
            href="/admin/standings"
            className="text-primary underline underline-offset-4"
          >
            hide or reveal them
          </Link>
          ,{" "}
          <Link
            href="/admin/announcements"
            className="text-primary underline underline-offset-4"
          >
            post Announcements
          </Link>{" "}
          and{" "}
          <Link
            href="/admin/awards"
            className="text-primary underline underline-offset-4"
          >
            give Awards
          </Link>
          .
        </p>
      </div>
    </AdminShell>
  );
}
