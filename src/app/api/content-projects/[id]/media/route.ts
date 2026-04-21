import { NextRequest } from "next/server";
import {
  attachMediaFilesToProject,
  filesFromFormData,
} from "@/features/content/services/upload-service";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const audioFiles = filesFromFormData(formData, "audio");

    if (audioFiles.length > 1) {
      return apiError(new Error("Envie apenas um arquivo de audio."), "Falha ao processar upload.");
    }

    const mediaFiles = await attachMediaFilesToProject(id, {
      images: filesFromFormData(formData, "images"),
      audio: audioFiles[0],
    });

    return apiCreated({ mediaFiles });
  } catch (error) {
    return apiError(error, "Falha ao processar upload.");
  }
}
