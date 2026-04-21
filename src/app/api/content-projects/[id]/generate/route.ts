import { apiCreated, apiError } from "@/lib/api-response";
import { videoService } from "@/features/video/services/video-service";

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

    return apiCreated({ video });
  } catch (error) {
    return apiError(error, "Falha ao gerar video.");
  }
}
