"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { challenges, participants, users } from "@/db/schema";
import { logWeighIn, WeighInError } from "@/lib/weighins";

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
      baseline: Number(baselines[i]),
      unit: (unitsRaw[i] as "lb" | "kg") || "lb",
    }))
    .filter((p) => p.name && Number.isFinite(p.baseline) && p.baseline > 0);

  if (roster.length === 0) {
    return { ok: false, message: "Add at least one participant with a baseline weight." };
  }

  await db.transaction(async (tx) => {
    const [challenge] = await tx
      .insert(challenges)
      .values({ name, startDate, endDate, status: "active" })
      .returning();

    for (const p of roster) {
      const [user] = await tx
        .insert(users)
        .values({ name: p.name, phone: p.phone })
        .returning();
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
