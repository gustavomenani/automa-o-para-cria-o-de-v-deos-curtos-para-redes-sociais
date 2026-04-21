import { NextRequest, NextResponse } from "next/server";
import {
  attachMediaFilesToProject,
  filesFromFormData,
} from "@/features/content/upload-service";

export const runtime = "nodejs";

function errorResponse(error: unknown, status = 400) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Falha ao processar upload.",
    },
    { status },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const audioFiles = filesFromFormData(formData, "audio");

    if (audioFiles.length > 1) {
      return errorResponse(new Error("Envie apenas um arquivo de audio."));
    }

    const mediaFiles = await attachMediaFilesToProject(id, {
      images: filesFromFormData(formData, "images"),
      audio: audioFiles[0],
    });

    return NextResponse.json({ mediaFiles }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
