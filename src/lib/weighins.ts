import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, participants, users, weighIns } from "@/db/schema";

export class WeighInError extends Error {}

interface LogWeighInArgs {
  /** Resolve the participant by personal token (web) ... */
  token?: string;
  /** ... or by phone number (future SMS path). */
  phone?: string;
  weight: number;
  unit?: "lb" | "kg";
  source: "web" | "sms";
  /** Defaults to now; injectable for tests/backfill. */
  at?: Date;
}

/**
 * The single entry point for recording a weigh-in. Both the web Server Action
 * and the (future) Twilio SMS webhook call this, so the validation and write
 * logic lives in exactly one place.
 */
export async function logWeighIn(args: LogWeighInArgs) {
  const { token, phone, weight, source } = args;

  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) {
    throw new WeighInError("Please enter a realistic weight.");
  }

  const participant = await resolveParticipant({ token, phone });
  if (!participant) {
    throw new WeighInError("Could not find an active entry for you.");
  }

  const unit = args.unit ?? participant.unit;

  const [inserted] = await db
    .insert(weighIns)
    .values({
      participantId: participant.id,
      weight,
      unit,
      source,
      loggedAt: args.at ?? new Date(),
    })
    .returning();

  return { weighIn: inserted, participant };
}

async function resolveParticipant({
  token,
  phone,
}: {
  token?: string;
  phone?: string;
}) {
  if (token) {
    // Guard against malformed tokens hitting the uuid column.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token))
      return null;
    const rows = await db
      .select()
      .from(participants)
      .where(eq(participants.accessToken, token))
      .limit(1);
    return rows[0] ?? null;
  }

  if (phone) {
    // Match the user by phone, then their entry in the active challenge.
    const rows = await db
      .select({ participant: participants })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .innerJoin(challenges, eq(challenges.id, participants.challengeId))
      .where(and(eq(users.phone, phone), eq(challenges.status, "active")))
      .limit(1);
    return rows[0]?.participant ?? null;
  }

  return null;
}
