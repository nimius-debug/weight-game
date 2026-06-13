import Link from "next/link";
import { getActiveChallenge } from "@/lib/queries";
import { dayDiff, todayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const challenge = await getActiveChallenge();

  if (!challenge) {
    return (
      <main className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">⚖️ Weight Game</h1>
        <p className="text-slate-500">No active challenge yet.</p>
        <Link
          href="/admin"
          className="inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white"
        >
          Set up a challenge
        </Link>
      </main>
    );
  }

  const today = todayKey();
  const daysLeft = Math.max(0, dayDiff(challenge.endDate, today));
  const daysIn = Math.max(0, dayDiff(today, challenge.startDate) + 1);
  const ended = dayDiff(today, challenge.endDate) > 0;

  return (
    <main className="space-y-6 text-center">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">⚖️ {challenge.name}</h1>
        <p className="text-sm text-slate-500">
          {challenge.startDate} → {challenge.endDate}
        </p>
      </header>

      <div className="rounded-2xl bg-brand/10 p-6">
        {ended ? (
          <p className="text-lg font-semibold text-brand-dark">
            🏁 Challenge complete!
          </p>
        ) : (
          <>
            <p className="text-5xl font-extrabold tabular-nums text-brand-dark">
              {daysLeft}
            </p>
            <p className="text-sm text-slate-500">
              days left &middot; day {daysIn} in progress
            </p>
          </>
        )}
      </div>

      <Link
        href="/leaderboard"
        className="inline-block rounded-lg bg-brand px-6 py-3 font-semibold text-white shadow"
      >
        View leaderboard →
      </Link>

      <p className="text-xs text-slate-400">
        Logging your weight? Open your personal link (it looks like
        <code className="mx-1">/u/your-code</code>).
      </p>
    </main>
  );
}
