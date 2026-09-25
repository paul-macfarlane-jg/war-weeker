import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { SeedOverwriteWarning } from "@/components/seed-overwrite-warning";
import { WarWeekSettingsForm } from "@/components/war-week-settings-form";
import { settingsInputFrom } from "@/lib/setup";

import { loadAdminPage } from "../../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "War Week settings · War Weeker" };

export default async function WarWeekSettingsPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage(
    "/admin/setup/war-week",
  );
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Setup">
      <section className="flex max-w-3xl flex-col gap-4">
        <Link
          href="/admin/setup"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          ← Setup
        </Link>
        <h1 className="text-2xl font-bold">War Week settings</h1>
        <SeedOverwriteWarning />
        <WarWeekSettingsForm
          key={warWeek.updatedAt.toISOString()}
          initial={settingsInputFrom(warWeek)}
          actorEmail={email}
        />
      </section>
    </AdminShell>
  );
}
