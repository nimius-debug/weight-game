"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createChallengeAction, type ActionResult } from "@/app/actions";

const ROWS = [0, 1, 2, 3]; // four friends by default

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white shadow disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create challenge"}
    </button>
  );
}

export function CreateChallengeForm({ adminToken }: { adminToken: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createChallengeAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="adminToken" value={adminToken} />

      <div>
        <label className="text-sm font-medium text-slate-500">
          Challenge name
        </label>
        <input
          name="name"
          required
          placeholder="Summer Shred 2026"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-500">Start</label>
          <input
            name="startDate"
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-500">End</label>
          <input
            name="endDate"
            type="date"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-500">
          Players (name + starting weight)
        </legend>
        {ROWS.map((i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              name="pname"
              placeholder={`Friend ${i + 1}`}
              className="col-span-5 rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              name="pphone"
              placeholder="phone (optional)"
              className="col-span-3 rounded-lg border border-slate-300 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              name="pbaseline"
              type="number"
              step="0.1"
              inputMode="decimal"
              placeholder="wt"
              className="col-span-2 rounded-lg border border-slate-300 px-2 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              name="punit"
              className="col-span-2 rounded-lg border border-slate-300 px-1 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </div>
        ))}
        <p className="text-xs text-slate-400">
          Leave a row blank to skip it. Phone is optional now (used later for the
          SMS path).
        </p>
      </fieldset>

      <SubmitButton />

      {state && (
        <p
          className={`text-sm ${state.ok ? "text-brand-dark" : "text-red-500"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
