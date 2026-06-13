import Link from "next/link";
import { getActiveChallenge, getRoster } from "@/lib/queries";
import { CreateChallengeForm } from "./CreateChallengeForm";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = process.env.ADMIN_TOKEN;
  const authed = Boolean(expected) && token === expected;

  if (!authed) {
    return (
      <main className="space-y-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-sm text-slate-500">
          Enter the admin token to manage challenges.
        </p>
        <form method="get" className="flex gap-2">
          <input
            name="token"
            type="password"
            placeholder="ADMIN_TOKEN"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
          <button className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">
            Enter
          </button>
        </form>
        {!expected && (
          <p className="text-xs text-red-500">
            ADMIN_TOKEN is not set on the server.
          </p>
        )}
      </main>
    );
  }

  const active = await getActiveChallenge();
  const roster = active ? await getRoster(active.id) : [];
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-sm text-slate-500">
          Create a challenge and hand out personal links.
        </p>
      </header>

      {active && (
        <section className="space-y-3">
          <h2 className="font-semibold">
            Active: {active.name}{" "}
            <span className="text-sm font-normal text-slate-400">
              ({active.startDate} → {active.endDate})
            </span>
          </h2>
          <ul className="space-y-2 text-sm">
            {roster.map((p) => (
              <li
                key={p.participantId}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="font-medium">
                  {p.name} · {p.baselineWeight} {p.unit}
                </div>
                <code className="break-all text-xs text-brand-dark">
                  {base}/u/{p.accessToken}
                </code>
              </li>
            ))}
            {roster.length === 0 && (
              <li className="text-slate-400">No players yet.</li>
            )}
          </ul>
          <p className="text-xs text-slate-400">
            Send each friend their own link to bookmark on their phone.
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">
          {active ? "Start a new challenge" : "Create a challenge"}
        </h2>
        {active && (
          <p className="text-xs text-amber-600">
            Note: creating a new challenge adds a second active challenge. End
            the current one first if you only want one running.
          </p>
        )}
        <CreateChallengeForm adminToken={token!} />
      </section>

      <Link href="/leaderboard" className="text-sm text-brand-dark underline">
        → Leaderboard
      </Link>
    </main>
  );
}
