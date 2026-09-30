import Colors from "@dynatrace/strato-design-tokens/colors";

export type Status = "ideal" | "good" | "warning" | "critical";

/** Letter grade for a 0..1 coverage ratio, matching the scorecard bands. */
export function gradeOf(ratio: number): string {
  if (ratio >= 0.9) return "A";
  if (ratio >= 0.8) return "B";
  if (ratio >= 0.7) return "C";
  if (ratio >= 0.6) return "D";
  return "F";
}

export function statusOf(ratio: number): Status {
  if (ratio >= 0.9) return "ideal";
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.4) return "warning";
  return "critical";
}

export const STATUS_COLOR: Record<Status, string> = {
  ideal: Colors.Charts.Status.Ideal.Default,
  good: Colors.Charts.Status.Good.Default,
  warning: Colors.Charts.Status.Warning.Default,
  critical: Colors.Charts.Status.Critical.Default,
};

export function colorForRatio(ratio: number): string {
  return STATUS_COLOR[statusOf(ratio)];
}

/** Score out of 100, for the gauge and the grade chips. */
export function scoreOf(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}
