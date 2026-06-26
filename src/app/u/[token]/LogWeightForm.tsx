"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { upload } from "@vercel/blob/client";
import { logWeighInAction, type ActionResult } from "@/app/actions";

function SubmitButton({ uploading }: { uploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || uploading}
      className="rounded-lg bg-brand px-5 py-3 font-semibold text-white shadow disabled:opacity-50"
    >
      {uploading ? "Uploading…" : pending ? "Saving…" : "Log it"}
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

  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setPhotoUrl(blob.url);
    } catch {
      setUploadError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

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
        <SubmitButton uploading={uploading} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500">
          Scale photo
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="mt-1 w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
          required
        />
        {photoUrl && (
          <p className="mt-1 text-xs text-brand-dark">Photo uploaded ✓</p>
        )}
        {uploadError && (
          <p className="mt-1 text-xs text-red-500">{uploadError}</p>
        )}
      </div>

      <input type="hidden" name="photoUrl" value={photoUrl} />

      {state && (
        <p className={`text-sm ${state.ok ? "text-brand-dark" : "text-red-500"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
