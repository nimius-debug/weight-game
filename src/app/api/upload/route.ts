import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

// Map non-standard or less-supported MIME types to ones Vercel Blob accepts.
// Samsung cameras report image/jpg (not image/jpeg); HEIC/HEIF aren't supported.
const MIME_NORM: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/heic": "image/jpeg",
  "image/heif": "image/jpeg",
  "image/heic-sequence": "image/jpeg",
  "image/heif-sequence": "image/jpeg",
};

function normalizeMime(raw: string): string {
  const lower = raw.toLowerCase();
  return MIME_NORM[lower] ?? lower;
}

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });
  }

  const mimeType = normalizeMime(file.type) || "image/jpeg";
  const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const filename = `scale-${Date.now()}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public", contentType: mimeType });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
