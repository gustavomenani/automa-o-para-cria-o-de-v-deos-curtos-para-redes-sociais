import Link from "next/link";
import { CalendarClock, ExternalLink, PlusCircle, RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { DeleteContentButton } from "@/features/content/components/delete-content-button";
import { SubmitButton } from "@/components/submit-button";
import {
  processDueScheduledPostsAction,
  retryFailedScheduledPostsAction,
  retryScheduledPostAction,
} from "@/features/schedule/actions";
import { getScheduledPosts } from "@/features/schedule/queries";
import { ScheduleAutoProcessor } from "@/features/schedule/components/schedule-auto-processor";
import { requireUser } from "@/features/auth/session";
import { getConnectedSocialAccounts } from "@/features/settings/queries";
import { formatDateTime } from "@/lib/formatters";
import { toPublicFileUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

const platformLabels = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YouTube Shorts",
};

const statusLabels = {
  SCHEDULED: "Agendado",
  READY_TO_POST: "Pronto para postar",
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
  CANCELED: "Cancelado",
};

const statusBadgeClasses = {
  SCHEDULED: "bg-emerald-100 text-emerald-800",
  READY_TO_POST: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-sky-100 text-sky-800",
  FAILED: "bg-red-100 text-red-800",
  CANCELED: "bg-zinc-200 text-zinc-700",
};

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

function classifyScheduledPost(post: Awaited<ReturnType<typeof getScheduledPosts>>[number]) {
  const isReadyToPost = post.status === "SCHEDULED" && new Date(post.scheduledAt) <= new Date();

  return {
    ...post,
    isReadyToPost,
    visualStatus: isReadyToPost ? "READY_TO_POST" : post.status,
  };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    deleted?: string;
    scheduled?: string;
    processed?: string;
    retried?: string;
    bulkRetried?: string;
    retryError?: string;
    platform?: "ALL" | "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
    status?: "ALL" | "READY_TO_POST" | "SCHEDULED" | "FAILED" | "PUBLISHED" | "CANCELED";
    account?: string;
  }>;
}) {
  const feedback = await searchParams;
  const user = await requireUser();
  const scheduledPosts = (await getScheduledPosts(user.id)).map(classifyScheduledPost);
  const socialAccounts = await getConnectedSocialAccounts();
  const retryError = decodeFeedbackMessage(feedback.retryError);
  const platformFilter = feedback.platform ?? "ALL";
  const statusFilter = feedback.status ?? "ALL";
  const accountFilter = feedback.account ?? "ALL";

  const filteredPosts = scheduledPosts.filter((post) => {
    const matchesPlatform = platformFilter === "ALL" || post.platform === platformFilter;
    const matchesStatus = statusFilter === "ALL" || post.visualStatus === statusFilter;
    const matchesAccount =
      accountFilter === "ALL" || post.socialAccountId === accountFilter;

    return matchesPlatform && matchesStatus && matchesAccount;
  });

  const readyPosts = filteredPosts.filter((post) => post.visualStatus === "READY_TO_POST");
  const failedPosts = filteredPosts.filter((post) => post.status === "FAILED");
  const futurePosts = filteredPosts.filter((post) => post.status === "SCHEDULED" && !post.isReadyToPost);
  const publishedPosts = filteredPosts.filter((post) => post.status === "PUBLISHED");
  const shouldAutoProcess = readyPosts.length > 0;

  return (
    <AppShell>
      <ScheduleAutoProcessor enabled={shouldAutoProcess} />
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
              Agenda
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Postagens agendadas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              A tela processa vencidos em background, destaca falhas e deixa os retries operacionais
              sem precisar voltar para o projeto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={processDueScheduledPostsAction}>
              <SubmitButton pendingLabel="Processando vencidos..." variant="secondary" icon="calendar">
                Processar vencidos
              </SubmitButton>
            </form>
            <form action={retryFailedScheduledPostsAction}>
              <SubmitButton pendingLabel="Reenfileirando falhas..." variant="secondary">
                Repetir falhas vencidas
              </SubmitButton>
            </form>
            <Link
              href="/contents"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              <PlusCircle size={18} />
              Escolher conteudo
            </Link>
          </div>
        </div>

        {feedback.scheduled ? (
          <FeedbackBanner
            type="success"
            title="Postagem agendada"
            message="O agendamento foi salvo e ficara pronto para ser processado no horario definido."
          />
        ) : null}

        {feedback.deleted ? (
          <FeedbackBanner
            type="success"
            title="Conteudo excluido"
            message="O conteudo relacionado ao agendamento foi removido com seus arquivos e registros."
          />
        ) : null}

        {feedback.processed ? (
          <FeedbackBanner
            type="success"
            title="Agendamentos processados"
            message="As postagens vencidas com conta conectada foram tentadas agora."
          />
        ) : null}

        {feedback.retried ? (
          <FeedbackBanner
            type="success"
            title="Publicacao repetida"
            message="A tentativa foi reenviada e o status da agenda foi atualizado."
          />
        ) : null}

        {feedback.bulkRetried ? (
          <FeedbackBanner
            type="success"
            title="Falhas reenfileiradas"
            message="As falhas vencidas voltaram para a fila e foram processadas novamente."
          />
        ) : null}

        {retryError ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel repetir a publicacao"
            message={retryError}
          />
        ) : null}

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="font-semibold">Filtros</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Refine por plataforma, status e conta para revisar a fila certa.
              </p>
            </div>
            <Link href="/schedule" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              Limpar filtros
            </Link>
          </div>

          <form className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="platform" className="text-sm font-medium text-zinc-800">
                Plataforma
              </label>
              <select
                id="platform"
                name="platform"
                defaultValue={platformFilter}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="ALL">Todas</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="text-sm font-medium text-zinc-800">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="ALL">Todos</option>
                <option value="READY_TO_POST">Pronto para postar</option>
                <option value="SCHEDULED">Agendado futuro</option>
                <option value="FAILED">Falhou</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="CANCELED">Cancelado</option>
              </select>
            </div>

            <div>
              <label htmlFor="account" className="text-sm font-medium text-zinc-800">
                Conta
              </label>
              <select
                id="account"
                name="account"
                defaultValue={accountFilter}
                className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="ALL">Todas</option>
                {socialAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.platformLabel} · {account.accountName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <SubmitButton pendingLabel="Aplicando filtros..." variant="secondary">
                Aplicar filtros
              </SubmitButton>
            </div>
          </form>
        </section>

        {filteredPosts.length === 0 ? (
          <section className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
              <CalendarClock size={22} />
            </div>
            <h2 className="mt-4 font-semibold">Nenhuma postagem encontrada</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Ajuste os filtros ou abra um conteudo com video pronto para salvar um novo agendamento.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Prontos agora</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{readyPosts.length}</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Agendados futuros</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{futurePosts.length}</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Falhas</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{failedPosts.length}</p>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm text-zinc-500">Publicados</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">{publishedPosts.length}</p>
              </div>
            </section>

            <ScheduleSection
              title="Vencidos e prontos para postar"
              emptyMessage="Nenhum item vencido pronto para processamento."
              posts={readyPosts}
            />
            <ScheduleSection
              title="Falhas que pedem retry"
              emptyMessage="Nenhuma falha dentro dos filtros atuais."
              posts={failedPosts}
              allowRetry
            />
            <ScheduleSection
              title="Proximos agendamentos"
              emptyMessage="Nenhum agendamento futuro dentro dos filtros atuais."
              posts={futurePosts}
            />
            <ScheduleSection
              title="Historico publicado"
              emptyMessage="Nenhuma publicacao concluida dentro dos filtros atuais."
              posts={publishedPosts}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ScheduleSection({
  title,
  emptyMessage,
  posts,
  allowRetry = false,
}: {
  title: string;
  emptyMessage: string;
  posts: Array<ReturnType<typeof classifyScheduledPost>>;
  allowRetry?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
      </div>

      {posts.length === 0 ? (
        <p className="p-4 text-sm text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="divide-y divide-stone-200">
          {posts.map((post) => {
            const videoPath = post.project.generatedVideos[0]?.path;
            const scheduled = formatDateTime(post.scheduledAt);
            const statusLabel = statusLabels[post.visualStatus as keyof typeof statusLabels];

            return (
              <article
                key={post.id}
                className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{scheduled.date}</p>
                  <p className="mt-1 text-sm text-zinc-500">{scheduled.time}</p>
                  {post.isReadyToPost ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Vencido e aguardando processamento
                    </p>
                  ) : null}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/contents/${post.projectId}`}
                      className="font-semibold text-zinc-950 hover:text-teal-700"
                    >
                      {post.project.title}
                    </Link>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                      {platformLabels[post.platform]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClasses[post.visualStatus as keyof typeof statusBadgeClasses]}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {post.caption}
                  </p>
                  {post.socialAccount ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Conta: {post.socialAccount.accountName}
                      {post.providerStatus ? ` · provider: ${post.providerStatus}` : ""}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">Conta nao definida.</p>
                  )}
                  {post.publishErrorMessage ? (
                    <p className="mt-2 text-xs text-red-700">{post.publishErrorMessage}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {allowRetry ? (
                    <form action={retryScheduledPostAction}>
                      <input type="hidden" name="scheduledPostId" value={post.id} />
                      <SubmitButton pendingLabel="Repetindo..." variant="secondary">
                        <span className="inline-flex items-center gap-2">
                          <RefreshCcw size={14} />
                          Tentar novamente
                        </span>
                      </SubmitButton>
                    </form>
                  ) : null}
                  {videoPath ? (
                    <a
                      href={`${toPublicFileUrl(videoPath)}?download=1`}
                      className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-stone-100"
                    >
                      Baixar
                    </a>
                  ) : null}
                  <Link
                    href={`/contents/${post.projectId}`}
                    className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Abrir
                    <ExternalLink size={14} />
                  </Link>
                  <DeleteContentButton
                    contentId={post.projectId}
                    compact
                    redirectTarget="schedule"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
