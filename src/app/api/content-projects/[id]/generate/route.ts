import { NextResponse } from "next/server";
import { videoService } from "@/features/video/video-service";

export const runtime = "nodejs";

async function getCaptionOverride(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return undefined;
  }

  const body = (await request.json().catch(() => null)) as { caption?: unknown } | null;

  return typeof body?.caption === "string" ? body.caption : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const captionText = await getCaptionOverride(request);
    const video = await videoService.generateProjectVideo(id, { captionText });

    return NextResponse.json({ video }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao gerar video.",
      },
      { status: 400 },
    );
  }
}
