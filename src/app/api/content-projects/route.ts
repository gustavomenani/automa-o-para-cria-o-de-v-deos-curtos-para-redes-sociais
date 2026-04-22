import { NextRequest } from "next/server";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { getCurrentUser } from "@/features/auth/session";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError(new Error("Faca login para acessar seus projetos."), "Nao autorizado.", 401);
    }

    const formData = await request.formData();
    const { input, files } = parseProjectFormData(formData);
    const project = await createProjectWithUploads(input, files, user.id);

    return apiCreated({ project, files: project.mediaFiles });
  } catch (error) {
    return apiError(error, "Falha ao processar upload.");
  }
}
