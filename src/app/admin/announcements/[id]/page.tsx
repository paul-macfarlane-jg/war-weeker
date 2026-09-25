import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminRefused, AdminShell } from "@/components/admin-shell";
import { AnnouncementForm } from "@/components/announcement-form";
import { sanitizeContent } from "@/lib/rich-text/content";
import { getAnnouncementForEdit } from "@/queries/announcements";

import { loadAdminPage } from "../../gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit Announcement · JG War Week" };

export default async function EditAnnouncementPage({
  params,
}: PageProps<"/admin/announcements/[id]">) {
  const { id } = await params;
  const { warWeek, email, isOrganizer, editions } = await loadAdminPage(
    `/admin/announcements/${id}`,
  );
  if (!isOrganizer) return <AdminRefused warWeek={warWeek} email={email} />;

  const announcement = await getAnnouncementForEdit(warWeek, id);
  if (!announcement) notFound();

  // The stored body was sanitized on write; sanitize again so the editor is
  // only ever handed the closed content set.
  const body = sanitizeContent(announcement.body);

  return (
    <AdminShell
      warWeek={warWeek}
      email={email}
      editions={editions}
      current="Announcements"
    >
      <section className="flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-bold">Edit Announcement</h1>
        <p className="text-foreground/70 text-sm">
          Posted by {announcement.authorEmail}.
        </p>
        <AnnouncementForm
          announcementId={announcement.id}
          initial={{
            title: announcement.title,
            body: body.ok ? body.content : { type: "doc", content: [] },
            videoUrls: announcement.videoUrls,
            pinned: announcement.pinned,
          }}
        />
      </section>
    </AdminShell>
  );
}
