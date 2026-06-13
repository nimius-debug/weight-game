import Link from "next/link";
import { getActiveChallenge, getLeaderboard } from "@/lib/queries";
import { dayDiff, todayKey } from "@/lib/dates";
import { formatPctLost, rankBadge, streakFlame } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const challenge = await getActiveChallenge();

  if (!challenge) {
    return (
      <main className="space-y-4 text-center">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <p className="text-slate-500">No active challenge yet.</p>
        <Link href="/" className="text-brand-dark underline">
          ← Home
        </Link>
      </main>
    );
  }

  const { rows } = await getLeaderboard(challenge.id);
  const ended = dayDiff(todayKey(), challenge.endDate) > 0;

  return (
    <main className="space-y-5">
      <header className="text-center">
        <h1 className="text-xl font-bold">🏆 {challenge.name}</h1>
        <p className="text-sm text-slate-500">
          {ended ? "Final standings" : "Standings"} · ranked by Game Score
        </p>
      </header>

      {ended && rows[0] && (
        <div className="rounded-2xl bg-amber-100 p-4 text-center text-amber-900 dark:bg-amber-500/15 dark:text-amber-300">
          🎉 Champion: <span className="font-bold">{rows[0].name}</span> with{" "}
          {formatPctLost(rows[0].pctLost)} lost!
        </div>
      )}

      <ol className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.participantId}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl tabular-nums">
                  {rankBadge(r.rank)}
                </span>
                <span className="text-lg font-semibold">{r.name}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums text-brand-dark">
                  {r.gameScore.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">Game Score</div>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <Stat
                label="Lost"
                value={formatPctLost(r.pctLost)}
                sub={`${r.weightPoints.toFixed(0)} pts`}
              />
              <Stat
                label="Streak"
                value={streakFlame(r.currentStreak)}
                sub={`${r.streakPoints.toFixed(0)} pts`}
              />
              <Stat
                label="Consistency"
                value={`${r.consistencyPct.toFixed(0)}%`}
                sub={`${r.consistencyPoints.toFixed(0)} pts`}
              />
            </dl>
          </li>
        ))}
      </ol>

      <div className="text-center">
        <Link href="/" className="text-sm text-brand-dark underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 py-2 dark:bg-slate-800/60">
      <div className="font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
