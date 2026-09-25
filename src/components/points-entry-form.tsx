"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type PointsEntryActionResult,
  createPointsEntry,
  updatePointsEntry,
} from "@/actions/points-entries";
import { EntityCombobox } from "@/components/entity-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatMaxPoints,
  placementLabel,
  pointsForPlacement,
} from "@/lib/competitions";
import { formatPoints } from "@/lib/points";
import { overMaxWarning } from "@/lib/points-entry";
import type { PointsEntryFormOptions } from "@/queries/points-entries";

type Initial = {
  competitionId: string;
  targetId: string;
  points: string;
  note: string;
};

/**
 * Add or edit one Points Entry. The target list follows the chosen
 * Competition's scoring: Teams for team Competitions, Participants for
 * individual ones. After adding, the Competition stays selected so the next
 * result can be entered straight away.
 */
export function PointsEntryForm({
  options,
  teamLabel,
  entryId,
  initial,
}: {
  options: PointsEntryFormOptions;
  teamLabel: string;
  /** Set when editing an existing entry. */
  entryId?: string;
  initial?: Initial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [competitionId, setCompetitionId] = useState(
    initial?.competitionId ?? "",
  );
  const [targetId, setTargetId] = useState(initial?.targetId ?? "");
  const [points, setPoints] = useState(initial?.points ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [result, setResult] = useState<PointsEntryActionResult | null>(null);

  const competition = options.competitions.find((c) => c.id === competitionId);
  const targets =
    competition?.scoring === "team"
      ? options.teams
      : competition?.scoring === "individual"
        ? options.participants
        : [];
  const places = (competition?.placementPoints ?? []).map((_, i) => i + 1);
  const warning = competition
    ? overMaxWarning(
        points.trim() === "" ? NaN : Number(points),
        competition.maxPoints,
      )
    : null;

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { competitionId, targetId, points, note };
    startTransition(async () => {
      const saved = entryId
        ? await updatePointsEntry(entryId, input)
        : await createPointsEntry(input);
      setResult(saved);
      if (!saved.ok) return;
      if (entryId) {
        router.push("/admin/points");
      } else {
        setTargetId("");
        setPoints("");
        setNote("");
      }
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4"
      aria-label="Points Entry"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Competition
        <EntityCombobox
          name="competitionId"
          aria-label="Competition"
          required
          placeholder="Choose a Competition…"
          items={options.competitions.map((c) => ({
            id: c.id,
            label: c.name,
            detail: `${c.scoring === "team" ? teamLabel : "Individual"} · ${formatMaxPoints(c.maxPoints)}`,
          }))}
          value={competitionId}
          onValueChange={(id) => {
            setCompetitionId(id);
            setTargetId("");
            setResult(null);
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        {competition?.scoring === "individual" ? "Participant" : teamLabel}
        <EntityCombobox
          name="targetId"
          aria-label={
            competition?.scoring === "individual" ? "Participant" : teamLabel
          }
          required
          disabled={!competition}
          placeholder={
            competition
              ? competition.scoring === "team"
                ? `Choose a ${teamLabel}…`
                : "Choose a Participant…"
              : "Choose a Competition first"
          }
          items={targets.map((t) => ({
            id: t.id,
            label: t.name,
            detail: t.team ?? undefined,
          }))}
          value={targetId}
          onValueChange={setTargetId}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Points
        <Input
          name="points"
          required
          type="number"
          step="0.01"
          inputMode="decimal"
          className="h-11 sm:h-9"
          value={points}
          onChange={(event) => setPoints(event.target.value)}
        />
      </label>
      {competition && places.length > 0 && (
        <div
          role="group"
          aria-label="Placement Points"
          className="-mt-2 flex flex-wrap gap-2"
        >
          {places.map((place) => {
            const preset = pointsForPlacement(competition, place)!;
            return (
              <Button
                key={place}
                type="button"
                variant="outline"
                onClick={() => setPoints(String(preset))}
              >
                {`${placementLabel(place)} · ${formatPoints(preset)}`}
              </Button>
            );
          })}
        </div>
      )}
      {warning && (
        <p role="status" className="text-sm font-medium text-amber-600">
          ⚠️ {warning}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Note (optional)
        <Input
          name="note"
          maxLength={500}
          className="h-11 sm:h-9"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : entryId ? "Save changes" : "Add Points Entry"}
        </Button>
        {entryId && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push("/admin/points")}
          >
            Cancel
          </Button>
        )}
        {result && !pending && (
          <p
            role={result.ok ? "status" : "alert"}
            className={
              result.ok ? "text-sm text-green-600" : "text-destructive text-sm"
            }
          >
            {result.ok ? "Saved." : result.error}
          </p>
        )}
      </div>
    </form>
  );
}
