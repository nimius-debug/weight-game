import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLeaderboard,
  getParticipantByToken,
  getWeighIns,
} from "@/lib/queries";
import { dayKeyOf } from "@/lib/dates";
import { formatPctLost, formatWeight, streakFlame } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { LogWeightForm } from "./LogWeightForm";
import { SetBaselineForm } from "./SetBaselineForm";
import { SetFinalWeightForm } from "./SetFinalWeightForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await getParticipantByToken(token);
  if (!found) notFound();

  const { participant, user, challenge } = found;
  const [weighInRows, { rows: board }] = await Promise.all([
    getWeighIns(participant.id),
    getLeaderboard(challenge.id),
  ]);

  const me = board.find((r) => r.participantId === participant.id);
  const lastWeight = weighInRows.at(-1)?.weight ?? null;
  const trend = weighInRows.map((w) => w.weight);

  // One value per day (last of the day) for a cleaner sparkline.
  const byDay = new Map<string, number>();
  for (const w of weighInRows) byDay.set(dayKeyOf(w.loggedAt), w.weight);
  const dailyTrend = [...byDay.values()];

  return (
    <main className="space-y-6">
      <header className="text-center">
        <p className="text-sm text-slate-500">{challenge.name}</p>
        <h1 className="text-2xl font-bold">Hi, {user.name} 👋</h1>
        {me && (
          <p className="mt-1 text-sm text-slate-500">
            Rank{" "}
            <span className="font-semibold text-brand-dark">#{me.rank}</span> ·
            Game Score{" "}
            <span className="font-semibold text-brand-dark">
              {me.gameScore.toFixed(1)}
            </span>
          </p>
        )}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {participant.baselineWeight === null && challenge.status !== "ended" ? (
          <SetBaselineForm token={token} unit={participant.unit} />
        ) : challenge.status === "ended" && participant.finalPhotoUrl === null ? (
          <SetFinalWeightForm token={token} unit={participant.unit} />
        ) : challenge.status === "ended" ? (
          <p className="text-center text-sm text-slate-500">
            Challenge complete — your final submission is recorded.
          </p>
        ) : (
          <LogWeightForm
            token={token}
            unit={participant.unit}
            lastWeight={lastWeight}
          />
        )}
      </section>

      {me && participant.baselineWeight !== null && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Sparkline values={dailyTrend.length ? dailyTrend : trend} />
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Fact
              label="Baseline"
              value={formatWeight(participant.baselineWeight, participant.unit)}
            />

            <Fact
              label="Latest"
              value={formatWeight(me.latestWeight, participant.unit)}
            />
            <Fact label="% of body weight lost" value={formatPctLost(me.pctLost)} />
            <Fact label="Streak" value={streakFlame(me.currentStreak)} />
            <Fact
              label="Days logged"
              value={`${me.daysLogged} / ${me.daysElapsed}`}
            />
            <Fact label="Consistency" value={`${me.consistencyPct.toFixed(0)}%`} />
          </dl>
        </section>
      )}

      <div className="text-center">
        <Link href="/leaderboard" className="text-sm text-brand-dark underline">
          See the leaderboard →
        </Link>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
