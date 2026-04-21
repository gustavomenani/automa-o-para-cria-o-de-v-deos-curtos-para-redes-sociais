import { NextResponse } from "next/server";
import { videoService } from "@/features/video/video-service";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const video = await videoService.generateProjectVideo(id);

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
