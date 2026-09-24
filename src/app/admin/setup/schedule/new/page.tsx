import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { ScheduleItemForm } from "@/components/schedule-item-form";
import { getSetupDays } from "@/queries/setup";
import { getCompetitionOptions } from "@/queries/setup-schedule-faq";

import { loadAdminPage } from "../../../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New Schedule Item · War Weeker" };

export default async function NewScheduleItemPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage(
    "/admin/setup/schedule/new",
  );
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  const [days, competitions] = await Promise.all([
    getSetupDays(warWeek),
    getCompetitionOptions(warWeek),
  ]);

  return (
    <AdminShell warWeek={warWeek} email={email} current="Setup">
      <section className="flex max-w-3xl flex-col gap-4">
        <Link
          href="/admin/setup/schedule"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          ← Schedule
        </Link>
        <h1 className="text-2xl font-bold">New Schedule Item</h1>
        {days.length === 0 ? (
          <p className="text-foreground/70 text-sm">
            Add a Day in{" "}
            <Link
              href="/admin/setup/days"
              className="text-primary underline-offset-4 hover:underline"
            >
              Days
            </Link>{" "}
            first.
          </p>
        ) : (
          <ScheduleItemForm days={days} competitions={competitions} />
        )}
      </section>
    </AdminShell>
  );
}
