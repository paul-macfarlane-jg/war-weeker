import type { Metadata } from "next";
import Link from "next/link";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { SeedOverwriteWarning } from "@/components/seed-overwrite-warning";

import { loadAdminPage } from "../gate";
import { SETUP_SECTIONS } from "./sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Setup · JG War Week" };

export default async function AdminSetupPage() {
  const { warWeek, email, isOrganizer } = await loadAdminPage("/admin/setup");
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  return (
    <AdminShell warWeek={warWeek} email={email} current="Setup">
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-bold">Setup</h1>
        <p className="text-foreground/70">
          Set up War Week {warWeek.edition.toUpperCase()} here instead of in its
          seed file.
        </p>
        <SeedOverwriteWarning />
        <ul className="grid gap-3 sm:grid-cols-2">
          {SETUP_SECTIONS.map(({ label, description, href }) => (
            <li key={label}>
              {href ? (
                <Link
                  href={href}
                  className="border-border hover:bg-muted flex h-full flex-col gap-1 rounded-lg border p-4"
                >
                  <span className="text-primary font-semibold">{label}</span>
                  <span className="text-foreground/70 text-sm">
                    {description}
                  </span>
                </Link>
              ) : (
                <div className="border-border text-foreground/50 flex h-full flex-col gap-1 rounded-lg border border-dashed p-4">
                  <span className="font-semibold">
                    {label} <span className="text-xs font-normal">Soon</span>
                  </span>
                  <span className="text-sm">{description}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
