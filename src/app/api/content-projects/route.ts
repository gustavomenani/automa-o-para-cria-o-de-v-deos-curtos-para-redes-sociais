import { NextRequest, NextResponse } from "next/server";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/upload-service";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : "Falha ao processar upload.",
    },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const { input, files } = parseProjectFormData(formData);
    const project = await createProjectWithUploads(input, files);

    return NextResponse.json(
      {
        project,
        files: project.mediaFiles,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
