"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type AwardActionResult,
  createAward,
  updateAward,
} from "@/actions/awards";
import { Button } from "@/components/ui/button";
import {
  AWARD_DESCRIPTION_MAX,
  AWARD_NAME_MAX,
  type AwardInput,
} from "@/lib/awards";
import type { AwardFormOptions } from "@/queries/awards";

const fieldClass =
  "border-border bg-background h-9 rounded-md border px-2 text-sm focus-visible:ring-ring/50 outline-none focus-visible:ring-3";

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
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<AwardActionResult | null>(null);

  const chosen = new Set(participantIds);
  const needle = filter.trim().toLowerCase();
  const shown = options.participants.filter(
    (p) =>
      chosen.has(p.id) ||
      needle === "" ||
      p.name.toLowerCase().includes(needle) ||
      p.team?.toLowerCase().includes(needle),
  );

  function toggle(id: string, on: boolean) {
    setParticipantIds((ids) =>
      on ? [...ids, id] : ids.filter((other) => other !== id),
    );
  }

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
        <input
          name="name"
          required
          maxLength={AWARD_NAME_MAX}
          className={fieldClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea
          name="description"
          rows={3}
          maxLength={AWARD_DESCRIPTION_MAX}
          className={`${fieldClass} h-auto py-2`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Recipients</legend>
        <p className="text-foreground/60 text-xs">
          A {teamLabel}, Participants, or both. Awards don&apos;t affect the
          Standings.
        </p>

        {options.teams.length > 0 && (
          <label className="flex flex-col gap-1 text-sm">
            {teamLabel}
            <select
              name="teamId"
              className={fieldClass}
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
            >
              <option value="">No {teamLabel}</option>
              {options.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-sm">
              Participants ({participantIds.length} chosen)
            </span>
            <input
              type="search"
              aria-label="Find Participants"
              placeholder={`Find by name or ${teamLabel}`}
              className={`${fieldClass} ml-auto w-64`}
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <ul className="border-border grid max-h-72 grid-cols-2 gap-x-4 overflow-y-auto rounded-md border p-2 md:grid-cols-3">
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={chosen.has(p.id)}
                    onChange={(event) => toggle(p.id, event.target.checked)}
                  />
                  <span className="truncate">
                    {p.name}
                    {p.team && (
                      <span className="text-foreground/50"> · {p.team}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
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
