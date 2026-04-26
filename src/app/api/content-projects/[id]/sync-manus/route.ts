import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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

    const { syncPendingManusRunForProject } = await import(
      "@/features/content/services/ai-asset-orchestrator"
    );
    const result = await syncPendingManusRunForProject(id);
    return apiCreated(result);
  } catch (error) {
    return apiError(error, "Falha ao sincronizar assets da Manus.");
  }
}
