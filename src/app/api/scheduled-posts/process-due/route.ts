import { getCurrentUser } from "@/features/auth/session";
import { publishDueScheduledPosts } from "@/integrations/social/publish-orchestrator";
import { apiCreated, apiError } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return apiError(new Error("Faca login para processar agendamentos."), "Nao autorizado.", 401);
    }

    const results = await publishDueScheduledPosts(user.id);
    const processed = results.filter((result) => result.ok).length;

    return apiCreated({
      processed,
      attempted: results.length,
    });
  } catch (error) {
    return apiError(error, "Falha ao processar agendamentos vencidos.");
  }
}
