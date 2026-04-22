import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { ContentList } from "@/features/content/components/content-list";
import { getContents } from "@/features/content/queries";
import { requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function ContentsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const feedback = await searchParams;
  const user = await requireUser();
  const contents = await getContents(user.id);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
              Historico
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Conteudos</h1>
          </div>
          <Link
            href="/contents/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <PlusCircle size={18} />
            Novo conteudo
          </Link>
        </div>

        {feedback.deleted ? (
          <FeedbackBanner
            type="success"
            title="Conteudo excluido"
            message="O projeto, seus arquivos locais, videos gerados e agendamentos relacionados foram removidos."
          />
        ) : null}

        <ContentList contents={contents} showDelete />
      </div>
    </AppShell>
  );
}
