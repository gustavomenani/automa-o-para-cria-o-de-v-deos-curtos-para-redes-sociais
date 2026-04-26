import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { CreateContentForm } from "@/features/content/components/create-content-form";
import { requireUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { getManusSettings } from "@/features/settings/queries";

function decodeFeedbackMessage(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; duplicate?: string; mode?: "manus" | "manual" }>;
}) {
  const feedback = await searchParams;
  const errorMessage = decodeFeedbackMessage(feedback.error);
  const user = await requireUser();
  const manusSettings = await getManusSettings();
  const duplicatedProject = feedback.duplicate
    ? await prisma.contentProject.findFirst({
        where: {
          id: feedback.duplicate,
          userId: user.id,
        },
        select: {
          title: true,
          prompt: true,
          caption: true,
          contentType: true,
        },
      })
    : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Novo conteudo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Criar video curto</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Digite um prompt para a Manus gerar roteiro, legenda, imagens e audio, ou use uploads manuais se preferir.
          </p>
        </div>
        {errorMessage ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel criar o conteudo"
            message={errorMessage}
          />
        ) : null}
        <CreateContentForm
          defaults={
            duplicatedProject
              ? {
                  title: `${duplicatedProject.title} copia`,
                  prompt: duplicatedProject.prompt,
                  caption: duplicatedProject.caption ?? "",
                  contentType: duplicatedProject.contentType,
                  mode: feedback.mode,
                }
              : {
                  mode: feedback.mode,
                }
          }
          recommendations={{
            reelsDuration: manusSettings.reelsDuration,
            reelsStyle: manusSettings.reelsStyle,
            storiesDuration: manusSettings.storiesDuration,
            storiesStyle: manusSettings.storiesStyle,
          }}
        />
      </div>
    </AppShell>
  );
}
