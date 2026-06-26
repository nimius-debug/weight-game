"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { upload } from "@vercel/blob/client";
import { setFinalWeightAction, type ActionResult } from "@/app/actions";

function SubmitButton({ uploading }: { uploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || uploading}
      className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white shadow disabled:opacity-50"
    >
      {uploading ? "Uploading photo…" : pending ? "Saving…" : "Submit final weight"}
    </button>
  );
}

export function SetFinalWeightForm({
  token,
  unit,
}: {
  token: string;
  unit: "lb" | "kg";
}) {
  const action = setFinalWeightAction.bind(null, token);
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
    <form action={formAction} className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-700 dark:text-slate-200">
          Submit your final weight
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          The challenge has ended. Upload a scale photo to confirm your result.
          This can only be submitted once.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-500">
          Final weight ({unit})
        </label>
        <input
          name="weight"
          type="number"
          step="0.1"
          inputMode="decimal"
          required
          placeholder="e.g. 172.5"
          className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-2xl font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-900"
        />
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

      <SubmitButton uploading={uploading} />

      {state && (
        <p className={`text-sm ${state.ok ? "text-brand-dark" : "text-red-500"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
