import { describe, it, expect } from "vitest";
import {
  computeLeaderboard,
  DEFAULT_CONFIG,
  type ParticipantInput,
} from "./scoring";

const START = "2026-01-01";
const END = "2026-03-01";

/** Helper: build daily weigh-ins starting at `from` for each weight given. */
function daily(from: string, weights: number[]) {
  const base = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  return weights.map((weight, i) => ({
    day: new Date(base + i * 86_400_000).toISOString().slice(0, 10),
    weight,
  }));
}

describe("computeLeaderboard - four player scenario", () => {
  // Today is Jan 8 => 8 days elapsed (Jan 1..8 inclusive).
  const today = "2026-01-08";

  const alice: ParticipantInput = {
    participantId: "a",
    name: "Alice",
    baselineWeight: 200,
    unit: "lb",
    // Logs every single day, down to 194 (lost 3% of baseline).
    weighIns: daily(START, [200, 199, 198, 197, 196, 195, 194, 194]),
  };

  const bob: ParticipantInput = {
    participantId: "b",
    name: "Bob",
    baselineWeight: 250,
    unit: "lb",
    // Strong start then ghosts after Jan 3 (streak broken, low consistency).
    weighIns: daily(START, [250, 248, 245]),
  };

  const carol: ParticipantInput = {
    participantId: "c",
    name: "Carol",
    baselineWeight: 180,
    unit: "lb",
    // Logs day 1 and day 8 only, and actually gained weight.
    weighIns: [
      { day: "2026-01-01", weight: 180 },
      { day: "2026-01-08", weight: 182 },
    ],
  };

  const dave: ParticipantInput = {
    participantId: "d",
    name: "Dave",
    baselineWeight: 220,
    unit: "lb",
    // Never logs anything.
    weighIns: [],
  };

  const board = computeLeaderboard({
    startDate: START,
    endDate: END,
    today,
    participants: [carol, dave, bob, alice], // unsorted on purpose
  });

  const byId = Object.fromEntries(board.map((r) => [r.participantId, r]));

  it("ranks the consistent loser first and the gainer last", () => {
    expect(board.map((r) => r.participantId)).toEqual(["a", "b", "d", "c"]);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("scores Alice: 3% lost, perfect consistency, 8-day streak", () => {
    const r = byId.a;
    expect(r.pctLost).toBe(3);
    expect(r.weightPoints).toBe(30);
    expect(r.daysElapsed).toBe(8);
    expect(r.daysLogged).toBe(8);
    expect(r.consistencyPct).toBe(100);
    expect(r.consistencyPoints).toBe(30);
    expect(r.currentStreak).toBe(8);
    expect(r.streakPoints).toBe(8);
    expect(r.gameScore).toBe(68);
  });

  it("breaks Bob's streak after he stops logging", () => {
    const r = byId.b;
    expect(r.daysLogged).toBe(3);
    expect(r.currentStreak).toBe(0); // last log Jan 3, gap of 5 days
    expect(r.streakPoints).toBe(0);
    expect(r.pctLost).toBe(2);
    expect(r.weightPoints).toBe(20);
    expect(r.gameScore).toBe(31.25);
  });

  it("gives Carol negative weight points for gaining", () => {
    const r = byId.c;
    expect(r.weightChange).toBe(2);
    expect(r.pctLost).toBeCloseTo(-1.11, 2);
    expect(r.weightPoints).toBeLessThan(0);
    expect(r.currentStreak).toBe(1); // logged today only, prev day missing
    expect(r.gameScore).toBeLessThan(0);
  });

  it("zeroes everything for Dave who never logs", () => {
    const r = byId.d;
    expect(r.latestWeight).toBe(220); // falls back to baseline
    expect(r.pctLost).toBe(0);
    expect(r.daysLogged).toBe(0);
    expect(r.consistencyPoints).toBe(0);
    expect(r.currentStreak).toBe(0);
    expect(r.gameScore).toBe(0);
  });
});

describe("computeLeaderboard - edge cases", () => {
  it("handles day one (start == today)", () => {
    const board = computeLeaderboard({
      startDate: START,
      endDate: END,
      today: START,
      participants: [
        {
          participantId: "x",
          name: "Xavier",
          baselineWeight: 200,
          unit: "lb",
          weighIns: [{ day: START, weight: 200 }],
        },
      ],
    });
    const r = board[0];
    expect(r.daysElapsed).toBe(1);
    expect(r.daysLogged).toBe(1);
    expect(r.consistencyPct).toBe(100);
    expect(r.currentStreak).toBe(1);
  });

  it("keeps a streak alive within the grace window (logged yesterday)", () => {
    const board = computeLeaderboard({
      startDate: START,
      endDate: END,
      today: "2026-01-09",
      participants: [
        {
          participantId: "g",
          name: "Grace",
          baselineWeight: 150,
          unit: "lb",
          // Logged Jan 1..8 but not yet on Jan 9 (today).
          weighIns: daily(START, [150, 150, 150, 150, 150, 150, 150, 150]),
        },
      ],
    });
    expect(board[0].currentStreak).toBe(8);
  });

  it("breaks a streak once the gap exceeds the grace window", () => {
    const board = computeLeaderboard({
      startDate: START,
      endDate: END,
      today: "2026-01-10",
      participants: [
        {
          participantId: "h",
          name: "Hank",
          baselineWeight: 150,
          unit: "lb",
          // Last log was Jan 8; today is Jan 10 => gap of 2 days.
          weighIns: daily(START, [150, 150, 150, 150, 150, 150, 150, 150]),
        },
      ],
    });
    expect(board[0].currentStreak).toBe(0);
  });

  it("uses the last weigh-in of a day when several are logged", () => {
    const board = computeLeaderboard({
      startDate: START,
      endDate: END,
      today: "2026-01-02",
      participants: [
        {
          participantId: "m",
          name: "Mia",
          baselineWeight: 160,
          unit: "lb",
          weighIns: [
            { day: "2026-01-02", weight: 159 },
            { day: "2026-01-02", weight: 158 }, // later entry wins
          ],
        },
      ],
    });
    expect(board[0].latestWeight).toBe(158);
    expect(board[0].daysLogged).toBe(1); // counts as a single day
  });

  it("stops the clock at the end date", () => {
    // Today is well past the end; daysElapsed should reflect the challenge
    // length, not the calendar gap to today.
    const board = computeLeaderboard({
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      today: "2026-06-01",
      participants: [
        {
          participantId: "z",
          name: "Zoe",
          baselineWeight: 100,
          unit: "lb",
          weighIns: daily("2026-01-01", [100, 99, 98, 97, 96]),
        },
      ],
    });
    expect(board[0].daysElapsed).toBe(5); // Jan 1..5, not to June
    expect(board[0].consistencyPct).toBe(100);
  });

  it("respects a custom config", () => {
    const board = computeLeaderboard({
      startDate: START,
      endDate: END,
      today: START,
      participants: [
        {
          participantId: "c1",
          name: "Custom",
          baselineWeight: 100,
          unit: "lb",
          weighIns: [{ day: START, weight: 98 }], // 2% lost
        },
      ],
      config: { ...DEFAULT_CONFIG, weightPointsPerPercent: 5 },
    });
    expect(board[0].weightPoints).toBe(10); // 2% * 5
  });
});
