import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.ADMIN_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.execute(
      sql`ALTER TABLE "participants" ALTER COLUMN "baseline_weight" DROP NOT NULL`,
    );
  } catch (e: unknown) {
    // Already nullable — safe to ignore
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("already")) console.warn("DROP NOT NULL:", msg);
  }

  await db.execute(
    sql`ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "baseline_photo_url" text`,
  );
  await db.execute(
    sql`ALTER TABLE "participants" ADD COLUMN IF NOT EXISTS "final_photo_url" text`,
  );

  return NextResponse.json({ ok: true, message: "Migration applied." });
}
