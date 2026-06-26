"use client";

import { endChallengeAction, deleteChallengeAction } from "@/app/actions";

export function ChallengeControls({
  challengeId,
  adminToken,
}: {
  challengeId: string;
  adminToken: string;
}) {
  return (
    <div className="flex gap-2">
      <form action={endChallengeAction}>
        <input type="hidden" name="challengeId" value={challengeId} />
        <input type="hidden" name="adminToken" value={adminToken} />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-amber-600"
        >
          End challenge
        </button>
      </form>
      <form action={deleteChallengeAction}>
        <input type="hidden" name="challengeId" value={challengeId} />
        <input type="hidden" name="adminToken" value={adminToken} />
        <button
          type="submit"
          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-red-600"
          onClick={(e) => {
            if (!confirm("Permanently delete this challenge and all its data?")) {
              e.preventDefault();
            }
          }}
        >
          Delete challenge
        </button>
      </form>
    </div>
  );
}
