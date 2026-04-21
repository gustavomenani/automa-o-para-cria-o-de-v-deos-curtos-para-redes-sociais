import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { storageRoot } from "@/lib/paths";

const mimeTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const filePath = path.resolve(storageRoot, ...pathSegments);
  const relative = path.relative(storageRoot, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const headers = new Headers({
      "content-type": mimeTypes[ext] ?? "application/octet-stream",
      "cache-control": "private, max-age=60",
    });

    if (request.nextUrl.searchParams.get("download") === "1") {
      headers.set(
        "content-disposition",
        `attachment; filename="${path.basename(filePath).replace(/"/g, "")}"`,
      );
    }

    return new NextResponse(file, { headers });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
