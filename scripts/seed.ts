/**
 * Seed a demo challenge with four friends and a couple weeks of weigh-ins so
 * the leaderboard and dashboards have something to show locally.
 *
 *   DATABASE_URL=... npm run db:seed
 */
import { db } from "../src/db";
import { challenges, participants, users, weighIns } from "../src/db/schema";

function dayKey(offsetFromStart: number, start: Date): Date {
  return new Date(start.getTime() + offsetFromStart * 86_400_000);
}

async function main() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 9); // started 10 days ago (day 1..10)
  const end = new Date(start.getTime() + 56 * 86_400_000); // 8-week challenge

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  console.log("Seeding challenge…");
  const [challenge] = await db
    .insert(challenges)
    .values({
      name: "Demo Shred",
      startDate: fmt(start),
      endDate: fmt(end),
      status: "active",
    })
    .returning();

  // [name, phone, baseline, daily weights for days 1..10 (null = skipped)]
  const roster: [string, string | null, number, (number | null)[]][] = [
    ["Alex", "+15550000001", 200, [200, 199, 198, 198, 197, 196, 195, 195, 194, 193]],
    ["Sam", "+15550000002", 250, [250, 249, 248, null, null, 247, 246, null, 245, 244]],
    ["Jordan", "+15550000003", 180, [180, 180, 181, 180, 179, 180, 181, 180, 179, 180]],
    ["Casey", "+15550000004", 160, [160, 159, 158, 157, 156, 156, 155, 154, 153, 152]],
  ];

  for (const [name, phone, baseline, weights] of roster) {
    const [user] = await db.insert(users).values({ name, phone }).returning();
    const [p] = await db
      .insert(participants)
      .values({
        challengeId: challenge.id,
        userId: user.id,
        baselineWeight: baseline,
        unit: "lb",
      })
      .returning();

    const rows = weights
      .map((w, i) =>
        w == null
          ? null
          : {
              participantId: p.id,
              weight: w,
              unit: "lb" as const,
              source: "web" as const,
              loggedAt: dayKey(i, start),
            },
      )
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length) await db.insert(weighIns).values(rows);
    console.log(`  ${name}: ${rows.length} weigh-ins → /u/${p.accessToken}`);
  }

  console.log("Done. Visit /leaderboard");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
