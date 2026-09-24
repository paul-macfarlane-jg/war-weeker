"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  deleteAnnouncement,
  pinAnnouncement,
  unpinAnnouncement,
} from "@/actions/announcements";
import { Button } from "@/components/ui/button";

export function PinAnnouncementButton({
  id,
  pinned,
}: {
  id: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = pinned
            ? await unpinAnnouncement(id)
            : await pinAnnouncement(id);
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Saving…" : pinned ? "Unpin" : "Pin"}
    </Button>
  );
}

export function DeleteAnnouncementButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        startTransition(async () => {
          const result = await deleteAnnouncement(id);
          if (!result.ok) window.alert(result.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
