"use client";

import { useState } from "react";

import {
  createCompetition,
  deleteCompetition,
  updateCompetition,
} from "@/actions/setup";
import { PlacementPointsRows } from "@/components/placement-points-rows";
import {
  SetupRowButtons,
  SetupRowError,
  setupFieldClass as fieldClass,
  usageSummary,
  useSetupRow,
} from "@/components/setup-row";
import { SuggestionCombobox } from "@/components/suggestion-combobox";
import type { WarWeek } from "@/db/schema";
import type { CompetitionInput } from "@/lib/setup";
import type { SetupCompetition } from "@/queries/setup";

function emptyCompetition(mode: WarWeek["mode"]): CompetitionInput {
  return {
    name: "",
    description: "",
    scoring: mode === "free-for-all" ? "individual" : "team",
    maxPoints: "",
    placementPoints: "",
    countsTowardTeam: false,
    group: "",
  };
}

function inputFrom(competition: SetupCompetition): CompetitionInput {
  return {
    name: competition.name,
    description: competition.description ?? "",
    scoring: competition.scoring,
    maxPoints: competition.maxPoints?.toString() ?? "",
    placementPoints: competition.placementPoints?.join(", ") ?? "",
    countsTowardTeam: competition.countsTowardTeam,
    group: competition.competitionGroup ?? "",
  };
}

/** One Competition's fields, saved on its own. With no `competition` it adds. */
function CompetitionRow({
  competition,
  mode,
  teamLabel,
  groupSuggestions,
}: {
  competition?: SetupCompetition;
  mode: WarWeek["mode"];
  teamLabel: string;
  groupSuggestions: string[];
}) {
  const [values, setValues] = useState(
    competition ? inputFrom(competition) : emptyCompetition(mode),
  );
  const { pending, run, error } = useSetupRow(
    competition ? undefined : () => setValues(emptyCompetition(mode)),
  );
  const set =
    (field: Exclude<keyof CompetitionInput, "countsTowardTeam">) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValues((v) => ({ ...v, [field]: event.target.value }));

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // Only an individual Competition can count toward the Team.
    const input = {
      ...values,
      countsTowardTeam:
        values.scoring === "individual" && values.countsTowardTeam,
    };
    run(() =>
      competition
        ? updateCompetition(competition.id, input)
        : createCompetition(input),
    );
  }

  return (
    <li className="border-border border-b py-4 last:border-b-0">
      <form
        onSubmit={submit}
        aria-label={competition ? competition.name : "New Competition"}
        className="grid gap-3 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            name="name"
            required
            maxLength={120}
            className={fieldClass}
            value={values.name}
            onChange={set("name")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Group
          <SuggestionCombobox
            name="group"
            maxLength={120}
            placeholder="Optional"
            suggestions={groupSuggestions}
            value={values.group}
            onValueChange={(group) => setValues((v) => ({ ...v, group }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Description
          <textarea
            name="description"
            maxLength={2000}
            rows={2}
            placeholder="Optional"
            className={`${fieldClass} h-auto py-1.5`}
            value={values.description}
            onChange={set("description")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Scoring
          <select
            name="scoring"
            className={fieldClass}
            value={values.scoring}
            onChange={set("scoring")}
          >
            {mode === "teams" && <option value="team">{teamLabel}</option>}
            <option value="individual">Individual</option>
          </select>
        </label>
        {mode === "teams" && (
          <label className="flex items-center gap-2 text-sm font-medium sm:self-end sm:pb-2">
            <input
              type="checkbox"
              name="countsTowardTeam"
              disabled={values.scoring !== "individual"}
              checked={
                values.scoring === "individual" && values.countsTowardTeam
              }
              onChange={(event) =>
                setValues((v) => ({
                  ...v,
                  countsTowardTeam: event.target.checked,
                }))
              }
            />
            Counts toward the {teamLabel}
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-start-1">
          Max points
          <input
            name="maxPoints"
            inputMode="decimal"
            placeholder="Optional"
            className={fieldClass}
            value={values.maxPoints}
            onChange={set("maxPoints")}
          />
        </label>
        <PlacementPointsRows
          value={values.placementPoints}
          maxPoints={values.maxPoints}
          onChange={(placementPoints) =>
            setValues((v) => ({ ...v, placementPoints }))
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
          <p className="text-foreground/60 text-xs">
            {competition &&
              usageSummary([
                [
                  competition.pointsEntryCount,
                  "Points Entry",
                  "Points Entries",
                ],
                [
                  competition.scheduleItemCount,
                  "Schedule Item",
                  "Schedule Items",
                ],
              ])}
          </p>
          <SetupRowButtons
            pending={pending}
            addLabel="Add Competition"
            onDelete={
              competition &&
              (() => {
                if (!window.confirm(`Delete ${competition.name}?`)) return;
                run(() => deleteCompetition(competition.id));
              })
            }
          />
        </div>
      </form>
      <SetupRowError error={error} />
    </li>
  );
}

/** The War Week's Competitions by name, each editable, plus an add form. */
export function CompetitionsEditor({
  competitions,
  mode,
  teamLabel,
  groupSuggestions,
}: {
  competitions: SetupCompetition[];
  mode: WarWeek["mode"];
  teamLabel: string;
  /** Competition Groups already used in this War Week. */
  groupSuggestions: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {competitions.length === 0 ? (
        <p className="text-foreground/70 text-sm">No Competitions yet.</p>
      ) : (
        <ul aria-label="Competitions">
          {competitions.map((c) => (
            // Keyed on the saved values so a refresh resets the row's fields.
            <CompetitionRow
              key={`${c.id}-${JSON.stringify(inputFrom(c))}`}
              competition={c}
              mode={mode}
              teamLabel={teamLabel}
              groupSuggestions={groupSuggestions}
            />
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Add a Competition</h2>
        <ul>
          <CompetitionRow
            mode={mode}
            teamLabel={teamLabel}
            groupSuggestions={groupSuggestions}
          />
        </ul>
      </section>
    </div>
  );
}
