import { NextRequest } from "next/server";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { input, files } = parseProjectFormData(formData);
    const project = await createProjectWithUploads(input, files);

    return apiCreated({ project, files: project.mediaFiles });
  } catch (error) {
    return apiError(error, "Falha ao processar upload.");
  }
}
