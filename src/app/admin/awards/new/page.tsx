import type { Metadata } from "next";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { AwardForm } from "@/components/award-form";
import { getAwardFormOptions } from "@/queries/awards";

import { loadAdminPage } from "../../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New Award · JG War Week" };

export default async function NewAwardPage() {
  const { warWeek, email, isOrganizer, editions } =
    await loadAdminPage("/admin/awards/new");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  const options = await getAwardFormOptions(warWeek);

  return (
    <AdminShell
      warWeek={warWeek}
      email={email}
      editions={editions}
      current="Awards"
    >
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-bold">New Award</h1>
        <AwardForm options={options} teamLabel={warWeek.teamLabel} />
      </section>
    </AdminShell>
  );
}
