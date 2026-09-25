"use client";

import { deleteAward } from "@/actions/awards";
import { ConfirmActionButton } from "@/components/confirm-dialog";

export function DeleteAwardButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmActionButton
      title={`Delete "${name}"?`}
      action={() => deleteAward(id)}
      successMessage="Award deleted"
    >
      Delete
    </ConfirmActionButton>
  );
}
