import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { CreateContentForm } from "@/features/content/components/create-content-form";
import { requireUser } from "@/features/auth/session";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const feedback = await searchParams;
  await requireUser();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Novo conteudo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Criar video curto</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Digite um prompt para a Gemini gerar roteiro, legenda, imagens, audio e o MP4, ou use uploads manuais se preferir.
          </p>
        </div>
        {feedback.error ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel criar o conteudo"
            message={decodeURIComponent(feedback.error)}
          />
        ) : null}
        <CreateContentForm />
      </div>
    </AppShell>
  );
}
