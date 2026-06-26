/** Format a signed percentage, e.g. 3 => "−3.0%" (loss) or -1.1 => "+1.1%". */
export function formatPctLost(pctLost: number): string {
  // pctLost is positive when weight was lost; show losses as the "good" number.
  const v = Math.abs(pctLost).toFixed(1);
  if (pctLost > 0) return `−${v}%`;
  if (pctLost < 0) return `+${v}%`;
  return "0.0%";
}

export function formatWeight(weight: number | null, unit: "lb" | "kg"): string {
  if (weight === null) return "—";
  return `${weight.toFixed(1)} ${unit}`;
}

/** Medal emoji for the top three, otherwise the numeric rank. */
export function rankBadge(rank: number): string {
  return ["🥇", "🥈", "🥉"][rank - 1] ?? `#${rank}`;
}

export function streakFlame(streak: number): string {
  if (streak <= 0) return "—";
  return `${"🔥".repeat(Math.min(streak, 3))} ${streak}`;
}
