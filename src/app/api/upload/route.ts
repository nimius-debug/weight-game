import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const file = form.get("file") as File | null;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10 MB." }, { status: 400 });
  }

  // Normalize HEIC/HEIF (iPhone) to jpeg for Vercel Blob compatibility
  const mimeType = file.type === "image/heic" || file.type === "image/heif"
    ? "image/jpeg"
    : file.type || "image/jpeg";
  const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
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
