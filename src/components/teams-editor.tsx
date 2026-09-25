"use client";

import { useState } from "react";

import {
  createParticipant,
  createTeam,
  deleteParticipant,
  deleteTeam,
  updateParticipant,
  updateTeam,
} from "@/actions/setup";
import {
  SetupRowButtons,
  SetupRowError,
  setupFieldClass as fieldClass,
  usageSummary,
  useSetupRow,
} from "@/components/setup-row";
import { SuggestionCombobox } from "@/components/suggestion-combobox";
import type { ParticipantInput, TeamInput } from "@/lib/setup";
import type { SetupParticipant, SetupTeam } from "@/queries/setup";

const EMPTY_TEAM: TeamInput = { name: "", color: "#888888", logoUrl: "" };

/** The color picker needs #rrggbb; expand #rgb and fall back to grey. */
function pickerValue(hex: string): string {
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${[...value.slice(1)].map((d) => d + d).join("")}`.toLowerCase();
  }
  return "#888888";
}

/** One Team's name, color and logo URL. With no `team` it's the add row. */
function TeamRow({ team, teamLabel }: { team?: SetupTeam; teamLabel: string }) {
  const initial: TeamInput = team
    ? { name: team.name, color: team.color, logoUrl: team.logoUrl ?? "" }
    : EMPTY_TEAM;
  const [values, setValues] = useState(initial);
  const { pending, run, error } = useSetupRow(
    team ? undefined : () => setValues(EMPTY_TEAM),
  );
  const set =
    (field: keyof TeamInput) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [field]: event.target.value }));

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() => (team ? updateTeam(team.id, values) : createTeam(values)));
  }

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <form
        onSubmit={submit}
        aria-label={team ? `${teamLabel} ${team.name}` : `New ${teamLabel}`}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium">
          Name
          <input
            name="name"
            required
            maxLength={80}
            className={fieldClass}
            value={values.name}
            onChange={set("name")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Color
          <span className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Color picker"
              className="border-border h-9 w-10 rounded-md border"
              value={pickerValue(values.color)}
              onChange={set("color")}
            />
            <input
              name="color"
              required
              maxLength={32}
              className={`${fieldClass} w-24 font-mono`}
              value={values.color}
              onChange={set("color")}
            />
          </span>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Logo URL
          <input
            name="logoUrl"
            maxLength={500}
            placeholder="Optional"
            className={fieldClass}
            value={values.logoUrl}
            onChange={set("logoUrl")}
          />
        </label>
        <SetupRowButtons
          pending={pending}
          addLabel={`Add ${teamLabel}`}
          onDelete={
            team &&
            (() => {
              if (!window.confirm(`Delete ${teamLabel} ${team.name}?`)) return;
              run(() => deleteTeam(team.id));
            })
          }
        />
      </form>
      {team && (
        <p className="text-foreground/60 mt-1 text-xs">
          {usageSummary([
            [team.participantCount, "Participant", "Participants"],
            [team.pointsEntryCount, "Points Entry", "Points Entries"],
            [team.awardCount, "Award", "Awards"],
          ])}
        </p>
      )}
      <SetupRowError error={error} />
    </li>
  );
}

const EMPTY_PARTICIPANT: ParticipantInput = {
  displayName: "",
  companyTag: "",
  email: "",
  teamId: "",
  isLeader: false,
};

/**
 * One roster row: display name, Company Tag, email, Team and Leader. With
 * no `participant` it's the inline "Add Participant" row.
 */
function ParticipantRow({
  participant,
  teams,
  teamLabel,
  leaderTitle,
  tagSuggestions,
}: {
  participant?: SetupParticipant;
  /** Empty in a free-for-all, which hides the Team and Leader fields. */
  teams: SetupTeam[];
  teamLabel: string;
  leaderTitle: string;
  /** Company Tags used in any War Week. */
  tagSuggestions: string[];
}) {
  const initial: ParticipantInput = participant
    ? {
        displayName: participant.displayName,
        companyTag: participant.companyTag ?? "",
        email: participant.email ?? "",
        teamId: participant.teamId ?? "",
        isLeader: participant.isLeader,
      }
    : EMPTY_PARTICIPANT;
  const [values, setValues] = useState(initial);
  const { pending, run, error } = useSetupRow(
    participant ? undefined : () => setValues(EMPTY_PARTICIPANT),
  );
  const set =
    (field: Exclude<keyof ParticipantInput, "isLeader">) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [field]: event.target.value }));

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    run(() =>
      participant
        ? updateParticipant(participant.id, values)
        : createParticipant(values),
    );
  }

  return (
    <li className="border-border border-b py-3 last:border-b-0">
      <form
        onSubmit={submit}
        aria-label={participant ? participant.displayName : "New Participant"}
        className="grid gap-2 sm:grid-cols-3 sm:items-end xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Display name
          <input
            name="displayName"
            required
            maxLength={120}
            className={fieldClass}
            value={values.displayName}
            onChange={set("displayName")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Company Tag
          <SuggestionCombobox
            name="companyTag"
            maxLength={40}
            placeholder="Optional"
            suggestions={tagSuggestions}
            value={values.companyTag}
            onValueChange={(companyTag) =>
              setValues((v) => ({ ...v, companyTag }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            maxLength={254}
            placeholder="Optional"
            className={fieldClass}
            value={values.email}
            onChange={set("email")}
          />
        </label>
        {teams.length > 0 ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {teamLabel}
              <select
                name="teamId"
                className={fieldClass}
                value={values.teamId}
                onChange={set("teamId")}
              >
                <option value="">No {teamLabel}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-9 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isLeader"
                checked={values.isLeader}
                onChange={(event) =>
                  setValues((v) => ({ ...v, isLeader: event.target.checked }))
                }
              />
              {leaderTitle}
            </label>
          </>
        ) : (
          <span className="hidden sm:col-span-2 sm:block" />
        )}
        <SetupRowButtons
          pending={pending}
          addLabel="Add Participant"
          onDelete={
            participant &&
            (() => {
              if (!window.confirm(`Delete ${participant.displayName}?`)) return;
              run(() => deleteParticipant(participant.id));
            })
          }
        />
      </form>
      {participant &&
        (participant.pointsEntryCount > 0 || participant.awardCount > 0) && (
          <p className="text-foreground/60 mt-1 text-xs">
            {usageSummary([
              [participant.pointsEntryCount, "Points Entry", "Points Entries"],
              [participant.awardCount, "Award", "Awards"],
            ])}
          </p>
        )}
      <SetupRowError error={error} />
    </li>
  );
}

/** The War Week's Teams, each editable, plus an add row. */
export function TeamsEditor({
  teams,
  teamLabel,
}: {
  teams: SetupTeam[];
  teamLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {teams.length === 0 ? (
        <p className="text-foreground/70 text-sm">No {teamLabel}s yet.</p>
      ) : (
        <ul aria-label={`${teamLabel}s`}>
          {teams.map((team) => (
            // Keyed on the saved values so a refresh resets the row's fields.
            <TeamRow
              key={`${team.id}-${team.name}-${team.color}-${team.logoUrl}`}
              team={team}
              teamLabel={teamLabel}
            />
          ))}
        </ul>
      )}
      <ul>
        <TeamRow teamLabel={teamLabel} />
      </ul>
    </div>
  );
}

/** The roster: every Participant, editable in place, then "Add Participant". */
export function RosterEditor({
  participants,
  teams,
  teamLabel,
  leaderTitle,
  tagSuggestions,
}: {
  participants: SetupParticipant[];
  teams: SetupTeam[];
  teamLabel: string;
  leaderTitle: string;
  /** Company Tags used in any War Week, for the Company Tag field. */
  tagSuggestions: string[];
}) {
  const rowProps = { teams, teamLabel, leaderTitle, tagSuggestions };
  return (
    <div className="flex flex-col gap-1">
      {participants.length === 0 ? (
        <p className="text-foreground/70 text-sm">No Participants yet.</p>
      ) : (
        <ul aria-label="Roster">
          {participants.map((p) => (
            <ParticipantRow
              key={[
                p.id,
                p.displayName,
                p.companyTag,
                p.email,
                p.teamId,
                p.isLeader,
              ].join("-")}
              participant={p}
              {...rowProps}
            />
          ))}
        </ul>
      )}
      <ul>
        <ParticipantRow {...rowProps} />
      </ul>
    </div>
  );
}
