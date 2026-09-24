import { z } from "zod";

import type { Competition, PointsEntry } from "@/db/schema";
import { formatPoints } from "@/lib/points";

/** The Points Entry form's raw fields, as strings from the browser. */
export type PointsEntryInput = {
  competitionId: string;
  targetId: string;
  points: string;
  note?: string | null;
};

export type PointsEntryValues = {
  competitionId: string;
  targetId: string;
  points: number;
  note: string | null;
};

// `points` is numeric(8, 2): at most two decimals and six whole digits.
const MAX_ABS_POINTS = 999_999.99;

const pointsEntrySchema = z.object({
  competitionId: z.uuid({ error: "Choose a Competition." }),
  targetId: z.uuid({ error: "Choose a Team or Participant." }),
  points: z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d{1,2})?$/, {
      error: "Points must be a number with at most two decimal places.",
    })
    .transform(Number)
    .refine((points) => Math.abs(points) <= MAX_ABS_POINTS, {
      error: `Points must be between -${MAX_ABS_POINTS} and ${MAX_ABS_POINTS}.`,
    }),
  note: z
    .string()
    .trim()
    .max(500, { error: "Keep the note to 500 characters or fewer." })
    .nullish()
    .transform((note) => (note ? note : null)),
});

/** Validates the Points Entry form. Never throws; returns the first error. */
export function parsePointsEntryInput(
  input: PointsEntryInput,
): { ok: true; value: PointsEntryValues } | { ok: false; error: string } {
  const result = pointsEntrySchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0].message };
  }
  return { ok: true, value: result.data };
}

export type PointsEntryTarget = Pick<PointsEntry, "teamId" | "participantId">;

/**
 * Resolves a form's target id into exactly one of Team or Participant: a
 * Team for a team Competition, a Participant for an individual one. The
 * roster is the War Week's own Teams and Participants, so a target from
 * another War Week is refused.
 */
export function checkPointsEntryTarget(
  competition: Pick<Competition, "scoring">,
  targetId: string,
  roster: { teamIds: Set<string>; participantIds: Set<string> },
): { ok: true; target: PointsEntryTarget } | { ok: false; error: string } {
  if (competition.scoring === "team") {
    return roster.teamIds.has(targetId)
      ? { ok: true, target: { teamId: targetId, participantId: null } }
      : {
          ok: false,
          error: "This Competition is scored by Team; pick a Team.",
        };
  }
  return roster.participantIds.has(targetId)
    ? { ok: true, target: { teamId: null, participantId: targetId } }
    : {
        ok: false,
        error: "This Competition is scored individually; pick a Participant.",
      };
}

/**
 * The warning shown when an entry goes over the Competition's max points.
 * Going over is allowed (it may be a bonus); the warning only catches typos.
 */
export function overMaxWarning(
  points: number,
  maxPoints: number | null,
): string | null {
  if (maxPoints === null || !Number.isFinite(points) || points <= maxPoints) {
    return null;
  }
  return `${formatPoints(points)} is over this Competition's max of ${formatPoints(maxPoints)} points. It will still save.`;
}
