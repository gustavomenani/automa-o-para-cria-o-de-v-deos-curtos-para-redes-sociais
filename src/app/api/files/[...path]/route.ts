import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { resolvedStorageRoot } from "@/lib/paths";
import { verifyFileAccessToken } from "@/lib/file-access-token";

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
  const filePath = path.resolve(resolvedStorageRoot, ...pathSegments);
  const relative = path.relative(resolvedStorageRoot, filePath);
  const relativePath = relative.split(path.sep).join("/");

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }

  const user = await getCurrentUser();
  const accessToken = request.nextUrl.searchParams.get("access");
  const hasSignedAccess =
    !user &&
    typeof accessToken === "string" &&
    verifyFileAccessToken(accessToken, relativePath);

  if (!user && !hasSignedAccess) {
    return NextResponse.json({ error: "Faca login para acessar seus projetos." }, { status: 401 });
  }

  const [mediaFile, generatedVideo] = await Promise.all([
    prisma.mediaFile.findFirst({
      where: user
        ? { path: filePath, project: { userId: user.id } }
        : { path: filePath },
      select: { id: true },
    }),
    prisma.generatedVideo.findFirst({
      where: user
        ? { path: filePath, project: { userId: user.id } }
        : { path: filePath },
      select: { id: true },
    }),
  ]);

  if (!mediaFile && !generatedVideo) {
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
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
    return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
  }
}
