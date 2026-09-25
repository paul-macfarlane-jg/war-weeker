"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type AwardActionResult,
  createAward,
  updateAward,
} from "@/actions/awards";
import { EntityCombobox } from "@/components/entity-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AWARD_DESCRIPTION_MAX,
  AWARD_NAME_MAX,
  type AwardInput,
} from "@/lib/awards";
import type { AwardFormOptions } from "@/queries/awards";

/** Base UI's Select won't accept `""` as an item value. */
const NO_TEAM = "none";

/**
 * Give or edit one Award: name, description, and its recipients — one Team,
 * any number of Participants, or both. The server action checks the
 * recipients belong to this War Week; its error is what's shown.
 */
export function AwardForm({
  awardId,
  initial,
  options,
  teamLabel,
}: {
  /** Set when editing an existing Award. */
  awardId?: string;
  initial?: AwardInput;
  options: AwardFormOptions;
  /** The War Week's Team Label, e.g. "House". */
  teamLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [teamId, setTeamId] = useState(initial?.teamId ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    initial?.participantIds ?? [],
  );
  const [result, setResult] = useState<AwardActionResult | null>(null);

  const participantItems = options.participants.map((p) => ({
    id: p.id,
    label: p.name,
    detail: p.team ?? undefined,
  }));

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      name,
      description,
      teamId: teamId || null,
      participantIds,
    };
    startTransition(async () => {
      const saved = awardId
        ? await updateAward(awardId, input)
        : await createAward(input);
      setResult(saved);
      if (!saved.ok) return;
      router.push("/admin/awards");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" aria-label="Award">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <Input
          name="name"
          required
          maxLength={AWARD_NAME_MAX}
          className="h-11 sm:h-9"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <Textarea
          name="description"
          rows={3}
          maxLength={AWARD_DESCRIPTION_MAX}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="text-sm font-medium">Recipients</legend>
        <p className="text-foreground/60 text-xs">
          A {teamLabel}, Participants, or both. Awards don&apos;t affect the
          Standings.
        </p>

        {options.teams.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            {teamLabel}
            <Select
              value={teamId === "" ? NO_TEAM : teamId}
              onValueChange={(value) =>
                setTeamId(!value || value === NO_TEAM ? "" : value)
              }
            >
              <SelectTrigger className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEAM}>No {teamLabel}</SelectItem>
                {options.teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm">
            Participants ({participantIds.length} chosen)
          </span>
          <EntityCombobox
            multiple
            items={participantItems}
            value={participantIds}
            onValueChange={setParticipantIds}
            placeholder={`Find by name or ${teamLabel}`}
            aria-label="Find Participants"
          />
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : awardId ? "Save changes" : "Give Award"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/admin/awards")}
        >
          Cancel
        </Button>
        {result && !result.ok && !pending && (
          <p role="alert" className="text-destructive text-sm">
            {result.error}
          </p>
        )}
      </div>
    </form>
  );
}
