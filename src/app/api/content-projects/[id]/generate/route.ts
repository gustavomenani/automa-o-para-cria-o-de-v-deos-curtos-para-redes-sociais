import { apiCreated, apiError } from "@/lib/api-response";
import { videoService } from "@/features/video/services/video-service";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";

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
    const user = await getCurrentUser();

    if (!user) {
      return apiError(new Error("Faca login para acessar seus projetos."), "Nao autorizado.", 401);
    }

    const { id } = await params;
    const project = await prisma.contentProject.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!project) {
      return apiError(new Error("Voce nao tem acesso a este conteudo."), "Acesso negado.", 403);
    }

    const captionText = await getCaptionOverride(request);
    const video = await videoService.generateProjectVideo(id, { captionText });

    return apiCreated({ video });
  } catch (error) {
    return apiError(error, "Falha ao gerar video.");
  }
}
