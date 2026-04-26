import { NextRequest } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError(new Error("Faca login para acessar seus projetos."), "Nao autorizado.", 401);
    }

    const { id } = await params;
    const formData = await request.formData();
    const { attachMediaFilesToProject, filesFromFormData } = await import(
      "@/features/content/services/upload-service"
    );
    const audioFiles = filesFromFormData(formData, "audio");

    if (audioFiles.length > 1) {
      return apiError(new Error("Envie apenas um arquivo de audio."), "Falha ao processar upload.");
    }

    const mediaFiles = await attachMediaFilesToProject(
      id,
      {
        images: filesFromFormData(formData, "images"),
        audio: audioFiles[0],
      },
      user.id,
    );

    return apiCreated({ mediaFiles });
  } catch (error) {
    return apiError(error, "Falha ao processar upload.");
  }
}
