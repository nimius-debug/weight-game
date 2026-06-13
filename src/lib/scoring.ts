/**
 * Pure scoring engine for the weight-loss game.
 *
 * No database or framework imports live here on purpose: the whole module is a
 * deterministic function of its inputs, which makes it trivial to unit-test and
 * keeps the "rules of the game" in one readable place.
 *
 * Game Score = weightPoints + consistencyPoints + streakPoints
 *   - weightPoints      : the star — % of baseline weight lost, scaled up.
 *   - consistencyPoints : reward for logging a high share of expected days.
 *   - streakPoints      : reward for an unbroken "don't break the chain" streak.
 *
 * All tunables live in DEFAULT_CONFIG so the balance can be changed without
 * touching the logic below.
 */

export interface ScoringConfig {
  /** Points awarded per 1% of baseline body weight lost. 5% lost => 50 pts. */
  weightPointsPerPercent: number;
  /** Points at 100% consistency (logged every expected day). */
  consistencyPointsAtFull: number;
  /** Points per day of current streak. */
  streakPointsPerDay: number;
  /** Maximum streak length that earns points (caps the streak bonus). */
  streakCap: number;
  /**
   * Grace gap (in days) before a streak is considered broken. 1 means "you
   * haven't weighed in *yet today* — your streak still stands."
   */
  streakGraceDays: number;
}

export const DEFAULT_CONFIG: ScoringConfig = {
  weightPointsPerPercent: 10,
  consistencyPointsAtFull: 30,
  streakPointsPerDay: 1,
  streakCap: 21,
  streakGraceDays: 1,
};

/** A calendar day key in the form "YYYY-MM-DD". */
export type DayKey = string;

export interface WeighInPoint {
  day: DayKey;
  weight: number;
}

export interface ParticipantInput {
  participantId: string;
  name: string;
  baselineWeight: number;
  unit: "lb" | "kg";
  /**
   * Weigh-ins for this participant, expected to be ordered by time ascending.
   * Multiple entries on the same day are allowed; the last one for a day wins.
   */
  weighIns: WeighInPoint[];
}

export interface ComputeArgs {
  startDate: DayKey;
  endDate: DayKey;
  /** "Now", as a calendar day. Lets tests run deterministically. */
  today: DayKey;
  participants: ParticipantInput[];
  config?: ScoringConfig;
}

export interface LeaderboardRow {
  rank: number;
  participantId: string;
  name: string;
  unit: "lb" | "kg";
  baselineWeight: number;
  latestWeight: number;
  /** Absolute weight change (negative = lost weight). */
  weightChange: number;
  /** Percent of baseline lost (positive = lost weight). */
  pctLost: number;
  daysElapsed: number;
  daysLogged: number;
  consistencyPct: number;
  currentStreak: number;
  weightPoints: number;
  consistencyPoints: number;
  streakPoints: number;
  gameScore: number;
}

// --- Date helpers (UTC, calendar-day granularity) ---

function toDayNumber(day: DayKey): number {
  const [y, m, d] = day.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Whole days from `from` to `to` (to - from). */
function dayDiff(to: DayKey, from: DayKey): number {
  return toDayNumber(to) - toDayNumber(from);
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** Collapse weigh-ins to one weight per day (the last one logged that day). */
function latestPerDay(weighIns: WeighInPoint[]): Map<DayKey, number> {
  const byDay = new Map<DayKey, number>();
  for (const w of weighIns) byDay.set(w.day, w.weight); // later entries overwrite
  return byDay;
}

function computeRow(
  p: ParticipantInput,
  args: ComputeArgs,
  config: ScoringConfig,
): LeaderboardRow {
  // The challenge clock stops at the end date; before then it's "today".
  const referenceDay =
    dayDiff(args.today, args.endDate) <= 0 ? args.today : args.endDate;

  const byDay = latestPerDay(p.weighIns);

  // Only days within [start, referenceDay] count toward the game.
  const inRangeDays = [...byDay.keys()].filter(
    (day) =>
      dayDiff(day, args.startDate) >= 0 && dayDiff(referenceDay, day) >= 0,
  );

  // Days that have elapsed (and are therefore "expected" to be logged).
  const daysElapsed =
    dayDiff(referenceDay, args.startDate) >= 0
      ? dayDiff(referenceDay, args.startDate) + 1
      : 0;
  const daysLogged = inRangeDays.length;

  // Latest weight = most recent in-range weigh-in; falls back to baseline.
  let latestWeight = p.baselineWeight;
  let lastLoggedDay: DayKey | null = null;
  for (const day of inRangeDays) {
    if (lastLoggedDay === null || dayDiff(day, lastLoggedDay) > 0) {
      lastLoggedDay = day;
      latestWeight = byDay.get(day)!;
    }
  }

  const weightChange = latestWeight - p.baselineWeight;
  const pctLost =
    p.baselineWeight > 0
      ? ((p.baselineWeight - latestWeight) / p.baselineWeight) * 100
      : 0;

  const consistencyPct =
    daysElapsed > 0 ? (daysLogged / daysElapsed) * 100 : 0;

  // Current streak: walk backwards from the last logged day while days are
  // contiguous. The streak only counts as "current" if that last logged day is
  // within the grace window of the reference day.
  let currentStreak = 0;
  if (lastLoggedDay !== null) {
    const gap = dayDiff(referenceDay, lastLoggedDay);
    if (gap <= config.streakGraceDays) {
      const loggedSet = new Set(inRangeDays);
      let cursor = lastLoggedDay;
      while (loggedSet.has(cursor)) {
        currentStreak += 1;
        const n = toDayNumber(cursor) - 1;
        cursor = new Date(n * 86_400_000).toISOString().slice(0, 10);
      }
    }
  }

  const weightPoints = pctLost * config.weightPointsPerPercent;
  const consistencyPoints =
    (consistencyPct / 100) * config.consistencyPointsAtFull;
  const streakPoints =
    Math.min(currentStreak, config.streakCap) * config.streakPointsPerDay;
  const gameScore = weightPoints + consistencyPoints + streakPoints;

  return {
    rank: 0, // filled in after sorting
    participantId: p.participantId,
    name: p.name,
    unit: p.unit,
    baselineWeight: p.baselineWeight,
    latestWeight: round(latestWeight),
    weightChange: round(weightChange),
    pctLost: round(pctLost),
    daysElapsed,
    daysLogged,
    consistencyPct: round(consistencyPct),
    currentStreak,
    weightPoints: round(weightPoints),
    consistencyPoints: round(consistencyPoints),
    streakPoints: round(streakPoints),
    gameScore: round(gameScore),
  };
}

/**
 * Compute the ranked leaderboard. Sorted by game score desc, with ties broken
 * by percent lost, then name.
 */
export function computeLeaderboard(args: ComputeArgs): LeaderboardRow[] {
  const config = args.config ?? DEFAULT_CONFIG;
  const rows = args.participants.map((p) => computeRow(p, args, config));

  rows.sort(
    (a, b) =>
      b.gameScore - a.gameScore ||
      b.pctLost - a.pctLost ||
      a.name.localeCompare(b.name),
  );
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}
