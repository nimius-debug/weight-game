"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { challenges, participants, users, weighIns } from "@/db/schema";
import { logWeighIn, WeighInError } from "@/lib/weighins";
import { getParticipantByToken } from "@/lib/queries";
import { verifyScalePhoto } from "@/lib/verifyScalePhoto";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Web form -> shared weigh-in service. */
export async function logWeighInAction(
  token: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const weight = Number(formData.get("weight"));
  const unit = (formData.get("unit") as "lb" | "kg") || undefined;
  const photoUrl = String(formData.get("photoUrl") || "").trim();

  if (!photoUrl.startsWith("https://")) {
    return { ok: false, message: "A scale photo is required." };
  }

  const verification = await verifyScalePhoto(photoUrl, weight, unit ?? "lb");
  if (!verification.ok) return { ok: false, message: verification.message };

  try {
    await logWeighIn({ token, weight, unit, source: "web" });
  } catch (err) {
    if (err instanceof WeighInError) return { ok: false, message: err.message };
    console.error(err);
    return { ok: false, message: "Something went wrong. Try again." };
  }

  revalidatePath(`/u/${token}`);
  revalidatePath("/leaderboard");
  return { ok: true, message: `Logged ${weight.toFixed(1)}. Nice work! 💪` };
}

function assertAdmin(token: FormDataEntryValue | null) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    throw new Error("Unauthorized");
  }
}

/**
 * Create a challenge along with its participants in one shot. Each participant
 * row contributes parallel `pname` / `pphone` / `pbaseline` / `punit` fields.
 */
export async function createChallengeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    assertAdmin(formData.get("adminToken"));
  } catch {
    return { ok: false, message: "Unauthorized." };
  }

  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");

  if (!name || !startDate || !endDate) {
    return { ok: false, message: "Name, start and end dates are required." };
  }

  const names = formData.getAll("pname").map(String);
  const phones = formData.getAll("pphone").map(String);
  const baselines = formData.getAll("pbaseline").map(String);
  const unitsRaw = formData.getAll("punit").map(String);

  const roster = names
    .map((n, i) => ({
      name: n.trim(),
      phone: phones[i]?.trim() || null,
      baseline: baselines[i] ? Number(baselines[i]) : null,
      unit: (unitsRaw[i] as "lb" | "kg") || "lb",
    }))
    .filter(
      (p) =>
        p.name &&
        (p.baseline === null ||
          (Number.isFinite(p.baseline) && p.baseline > 0)),
    );

  if (roster.length === 0) {
    return { ok: false, message: "Add at least one participant." };
  }

  await db.transaction(async (tx) => {
    const [challenge] = await tx
      .insert(challenges)
      .values({ name, startDate, endDate, status: "active" })
      .returning();

    for (const p of roster) {
      let user: typeof users.$inferSelect;
      if (p.phone) {
        // Reuse existing user by phone to avoid unique-constraint failure
        // when the same players join a subsequent challenge.
        [user] = await tx
          .insert(users)
          .values({ name: p.name, phone: p.phone })
          .onConflictDoUpdate({ target: users.phone, set: { name: p.name } })
          .returning();
      } else {
        [user] = await tx
          .insert(users)
          .values({ name: p.name, phone: null })
          .returning();
      }
      await tx.insert(participants).values({
        challengeId: challenge.id,
        userId: user.id,
        baselineWeight: p.baseline,
        unit: p.unit,
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true, message: `Created "${name}" with ${roster.length} players.` };
}

/** Player self-reports their starting weight (once, with a scale photo). */
export async function setBaselineAction(
  token: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const weight = Number(formData.get("weight"));
  const photoUrl = String(formData.get("photoUrl") || "").trim();

  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) {
    return { ok: false, message: "Please enter a realistic weight." };
  }
  if (!photoUrl.startsWith("https://")) {
    return { ok: false, message: "A scale photo is required." };
  }

  const found = await getParticipantByToken(token);
  if (!found) return { ok: false, message: "Invalid link." };

  const { participant, challenge } = found;

  if (challenge.status === "ended") {
    return { ok: false, message: "The challenge has ended. Use the final weigh-in form." };
  }
  if (participant.baselineWeight !== null) {
    return { ok: false, message: "You've already set your baseline weight." };
  }

  const verification = await verifyScalePhoto(photoUrl, weight, participant.unit);
  if (!verification.ok) return { ok: false, message: verification.message };

  await db
    .update(participants)
    .set({ baselineWeight: weight, baselinePhotoUrl: photoUrl })
    .where(eq(participants.id, participant.id));

  revalidatePath(`/u/${token}`);
  revalidatePath("/leaderboard");
  return {
    ok: true,
    message: `Baseline set to ${weight.toFixed(1)} ${participant.unit}. You're in!`,
  };
}

/** Player submits their final weight once the challenge has ended (with a scale photo). */
export async function setFinalWeightAction(
  token: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const weight = Number(formData.get("weight"));
  const photoUrl = String(formData.get("photoUrl") || "").trim();

  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) {
    return { ok: false, message: "Please enter a realistic weight." };
  }
  if (!photoUrl.startsWith("https://")) {
    return { ok: false, message: "A scale photo is required." };
  }

  const found = await getParticipantByToken(token);
  if (!found) return { ok: false, message: "Invalid link." };

  const { participant, challenge } = found;

  if (challenge.status !== "ended") {
    return {
      ok: false,
      message: "The challenge is still active. Final weigh-in opens when it ends.",
    };
  }
  if (participant.finalPhotoUrl !== null) {
    return { ok: false, message: "You've already submitted your final weigh-in." };
  }

  const verification = await verifyScalePhoto(photoUrl, weight, participant.unit);
  if (!verification.ok) return { ok: false, message: verification.message };

  await db.transaction(async (tx) => {
    await tx
      .update(participants)
      .set({ finalPhotoUrl: photoUrl })
      .where(eq(participants.id, participant.id));

    await tx.insert(weighIns).values({
      participantId: participant.id,
      weight,
      unit: participant.unit,
      source: "web",
      loggedAt: new Date(),
    });
  });

  revalidatePath(`/u/${token}`);
  revalidatePath("/leaderboard");
  return {
    ok: true,
    message: `Final weight of ${weight.toFixed(1)} ${participant.unit} recorded. Great effort!`,
  };
}

/** Admin marks a challenge as ended. */
export async function endChallengeAction(formData: FormData) {
  try {
    assertAdmin(formData.get("adminToken"));
  } catch {
    return;
  }
  const id = String(formData.get("challengeId") || "");
  if (!id) return;
  await db.update(challenges).set({ status: "ended" }).where(eq(challenges.id, id));
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}

/** Admin permanently deletes a challenge (cascades to participants + weigh-ins). */
export async function deleteChallengeAction(formData: FormData) {
  try {
    assertAdmin(formData.get("adminToken"));
  } catch {
    return;
  }
  const id = String(formData.get("challengeId") || "");
  if (!id) return;
  await db.delete(challenges).where(eq(challenges.id, id));
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
}
