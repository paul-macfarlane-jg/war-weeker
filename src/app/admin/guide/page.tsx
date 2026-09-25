import type { Metadata } from "next";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { OrganizerGuide } from "@/components/organizer-guide";

import { loadAdminPage } from "../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Organizer guide · JG War Week" };

export default async function AdminGuidePage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage("/admin/guide");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Guide">
      <OrganizerGuide
        edition={warWeek.edition}
        teamLabel={warWeek.teamLabel}
        leaderTitle={warWeek.leaderTitle}
      />
    </AdminShell>
  );
}
