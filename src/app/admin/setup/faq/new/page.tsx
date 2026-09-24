import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { FaqItemForm } from "@/components/faq-item-form";

import { loadAdminPage } from "../../../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New FAQ Item · War Weeker" };

export default async function NewFaqItemPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage(
    "/admin/setup/faq/new",
  );
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Setup">
      <section className="flex max-w-3xl flex-col gap-4">
        <Link
          href="/admin/setup/faq"
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          ← FAQ
        </Link>
        <h1 className="text-2xl font-bold">New FAQ Item</h1>
        <FaqItemForm />
      </section>
    </AdminShell>
  );
}
