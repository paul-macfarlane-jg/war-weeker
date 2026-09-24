import { z } from "zod";

/** The Award name's column length. */
export const AWARD_NAME_MAX = 120;

/** The Award description's column length. */
export const AWARD_DESCRIPTION_MAX = 1000;

export const NO_RECIPIENTS = "Choose a Team or at least one Participant.";

export const awardInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { error: "must not be empty" })
      .max(AWARD_NAME_MAX, {
        error: `must be at most ${AWARD_NAME_MAX} characters`,
      }),
    description: z
      .string()
      .trim()
      .max(AWARD_DESCRIPTION_MAX, {
        error: `must be at most ${AWARD_DESCRIPTION_MAX} characters`,
      })
      .nullish()
      .transform((value) => value || null),
    teamId: z
      .uuid({ error: "Choose a Team of this War Week." })
      .nullish()
      .transform((value) => value ?? null),
    participantIds: z
      .array(z.uuid({ error: "Choose Participants of this War Week." }))
      .default([])
      .transform((ids) => [...new Set(ids)]),
  })
  .refine((a) => a.teamId != null || a.participantIds.length > 0, {
    error: NO_RECIPIENTS,
    path: ["participantIds"],
  });

/** The Award form's raw fields. */
export type AwardInput = {
  name: string;
  description: string | null;
  teamId: string | null;
  participantIds: string[];
};

export type AwardValues = z.infer<typeof awardInputSchema>;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  description: "Description",
};

/** Validates the Award form. Never throws; returns the first error. */
export function parseAwardInput(
  input: AwardInput,
): { ok: true; value: AwardValues } | { ok: false; error: string } {
  const result = awardInputSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  const issue = result.error.issues[0];
  const label = FIELD_LABELS[String(issue.path[0])];
  // Field schemas word their errors as "must …"; prefix the field.
  const message =
    label && issue.message.startsWith("must ")
      ? `${label} ${issue.message}.`
      : issue.message;
  return { ok: false, error: message };
}

const uuid = z.uuid();

/** Whether a URL segment or action argument is shaped like a row id. */
export function isAwardId(id: string): boolean {
  return uuid.safeParse(id).success;
}
