/**
 * Placement Points as numbered rows (1st, 2nd…) in the Competition form.
 * The rows still submit the comma-separated text `parseCompetitionInput`
 * validates; these live errors only mirror its wording.
 */
import { MAX_PLACEMENTS } from "@/lib/competitions";

export const MAX_PLACES = MAX_PLACEMENTS;

/** The "5 · 3 · 1" quick fill. */
export const QUICK_FILL = ["5", "3", "1"];

const NUMBER = /^-?\d+(\.\d+)?$/;

/** One row per place from the form's Placement Points text. */
export function rowsFromPlacementPoints(text: string): string[] {
  return text.split(/[\s,]+/).filter(Boolean);
}

/** The form's Placement Points text from its rows; blank rows are skipped. */
export function placementPointsFromRows(rows: string[]): string {
  return rows
    .map((row) => row.trim())
    .filter(Boolean)
    .join(", ");
}

/** Live errors for the rows, in the server's wording; empty when valid. */
export function placementRowErrors(
  rows: string[],
  maxPoints: string,
): string[] {
  const values = rows.map((row) => row.trim()).filter(Boolean);
  const errors: string[] = [];
  if (values.length > MAX_PLACES) {
    errors.push(`Placement Points cover at most ${MAX_PLACES} places.`);
  }
  if (!values.every((value) => NUMBER.test(value))) {
    errors.push("Each place's Placement Points must be a number.");
    return errors;
  }
  const points = values.map(Number);
  if (points.some((p) => p < 0)) {
    errors.push("Placement Points can't be negative.");
  }
  if (points.some((p, i) => i > 0 && p > points[i - 1])) {
    errors.push(
      "Each place's Placement Points must be no more than the place above it.",
    );
  }
  const max = maxPoints.trim();
  if (points.length > 0 && NUMBER.test(max) && points[0] > Number(max)) {
    errors.push("1st place's Placement Points can't be more than Max points.");
  }
  return errors;
}
