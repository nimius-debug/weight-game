import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, participants, users, weighIns } from "@/db/schema";
import { computeLeaderboard, type LeaderboardRow } from "./scoring";
import { dayKeyOf, todayKey } from "./dates";

/** The single active challenge (this app runs one challenge at a time). */
export async function getActiveChallenge() {
  const rows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.status, "active"))
    .limit(1);
  return rows[0] ?? null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a well-formed UUID (the shape of our access tokens). */
export function isAccessToken(token: string): boolean {
  return UUID_RE.test(token);
}

/** Resolve a participant (plus their user + challenge) from a personal token. */
export async function getParticipantByToken(token: string) {
  // The token maps to a uuid column; bail early on malformed input so Postgres
  // doesn't throw on an invalid-uuid cast (which would surface as a 500).
  if (!isAccessToken(token)) return null;

  const rows = await db
    .select({
      participant: participants,
      user: users,
      challenge: challenges,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .innerJoin(challenges, eq(challenges.id, participants.challengeId))
    .where(eq(participants.accessToken, token))
    .limit(1);
  return rows[0] ?? null;
}

/** Roster for a challenge with each player's personal access token. */
export async function getRoster(challengeId: string) {
  return db
    .select({
      participantId: participants.id,
      name: users.name,
      phone: users.phone,
      baselineWeight: participants.baselineWeight,
      unit: participants.unit,
      accessToken: participants.accessToken,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.challengeId, challengeId))
    .orderBy(asc(users.name));
}

/** All weigh-ins for a participant, oldest first. */
export async function getWeighIns(participantId: string) {
  return db
    .select()
    .from(weighIns)
    .where(eq(weighIns.participantId, participantId))
    .orderBy(asc(weighIns.loggedAt));
}

/**
 * Build the ranked leaderboard for a challenge by loading every participant and
 * their weigh-ins, then handing the data to the pure scoring engine.
 */
export async function getLeaderboard(
  challengeId: string,
): Promise<{ challenge: typeof challenges.$inferSelect; rows: LeaderboardRow[] }> {
  const challengeRows = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);
  const challenge = challengeRows[0];
  if (!challenge) throw new Error("Challenge not found");

  const rows = await db
    .select({
      participant: participants,
      user: users,
      weighIn: weighIns,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .leftJoin(weighIns, eq(weighIns.participantId, participants.id))
    .where(eq(participants.challengeId, challengeId))
    .orderBy(asc(weighIns.loggedAt));

  // Group the flat join result by participant.
  const byParticipant = new Map<
    string,
    {
      participantId: string;
      name: string;
      baselineWeight: number;
      unit: "lb" | "kg";
      weighIns: { day: string; weight: number }[];
    }
  >();

  for (const row of rows) {
    const id = row.participant.id;
    if (!byParticipant.has(id)) {
      byParticipant.set(id, {
        participantId: id,
        name: row.user.name,
        baselineWeight: row.participant.baselineWeight,
        unit: row.participant.unit,
        weighIns: [],
      });
    }
    if (row.weighIn) {
      byParticipant.get(id)!.weighIns.push({
        day: dayKeyOf(row.weighIn.loggedAt),
        weight: row.weighIn.weight,
      });
    }
  }

  const leaderboard = computeLeaderboard({
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    today: todayKey(),
    participants: [...byParticipant.values()],
  });

  return { challenge, rows: leaderboard };
}
