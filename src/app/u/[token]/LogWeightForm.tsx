"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { logWeighInAction, type ActionResult } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-5 py-3 font-semibold text-white shadow disabled:opacity-50"
    >
      {pending ? "Saving…" : "Log it"}
    </button>
  );
}

export function LogWeightForm({
  token,
  unit,
  lastWeight,
}: {
  token: string;
  unit: "lb" | "kg";
  lastWeight: number | null;
}) {
  const action = logWeighInAction.bind(null, token);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm font-medium text-slate-500">
        Today&apos;s weight ({unit})
      </label>
      <div className="flex items-center gap-2">
        <input
          name="weight"
          type="number"
          step="0.1"
          inputMode="decimal"
          required
          defaultValue={lastWeight ?? undefined}
          placeholder={`e.g. ${lastWeight ?? 180}`}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-2xl font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-900"
        />
        <input type="hidden" name="unit" value={unit} />
        <SubmitButton />
      </div>

      {state && (
        <p
          className={`text-sm ${
            state.ok ? "text-brand-dark" : "text-red-500"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
