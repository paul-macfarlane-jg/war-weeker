const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Formats a points value for display: up to two decimals, no trailing zeros. */
export function formatPoints(points: number): string {
  return formatter.format(points);
}
