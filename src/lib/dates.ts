import type { DayKey } from "./scoring";

/**
 * The timezone the game's "days" are reckoned in. A friend group usually shares
 * one; set APP_TIMEZONE (e.g. "America/New_York") so streaks flip at local
 * midnight rather than UTC midnight.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "UTC";

/** Convert a Date to a "YYYY-MM-DD" key in the configured timezone. */
export function dayKeyOf(date: Date, tz: string = APP_TIMEZONE): DayKey {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's day key in the configured timezone. */
export function todayKey(tz: string = APP_TIMEZONE): DayKey {
  return dayKeyOf(new Date(), tz);
}

/** Whole days between two day keys (to - from). */
export function dayDiff(to: DayKey, from: DayKey): number {
  const n = (d: DayKey) => {
    const [y, m, day] = d.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, day) / 86_400_000);
  };
  return n(to) - n(from);
}
