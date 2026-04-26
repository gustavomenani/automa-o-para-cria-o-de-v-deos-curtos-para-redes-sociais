import type { ComponentType } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileAudio,
  FileVideo,
  ImageIcon,
  LayoutList,
  Music2,
  RadioTower,
  ScrollText,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { CaptionReviewForm } from "@/features/content/components/caption-review-form";
import { DeleteContentButton } from "@/features/content/components/delete-content-button";
import { GenerateVideoButton } from "@/features/content/components/generate-video-button";
import { ManusSyncMonitor } from "@/features/content/components/manus-sync-monitor";
import { SocialAccountPreferenceApplier } from "@/features/content/components/social-account-preference-applier";
import {
  generateContentVideoAction,
  publishSocialNowAction,
  syncManusAssetsAction,
} from "@/features/content/actions";
import { requireUser } from "@/features/auth/session";
import {
  formatAssetRunStatus,
  getDisplaySafeMessage,
  getMissingAssets,
  getRunSummaryMessage,
  maskProviderTaskId,
} from "@/features/content/asset-run-display";
import { getContentById } from "@/features/content/queries";
import { schedulePostAction } from "@/features/schedule/actions";
import { getConnectedSocialAccounts } from "@/features/settings/queries";
import { CAPTION_SYNC_WARNING } from "@/features/video/services/caption-helpers";
import { readStoredManusPlan } from "@/integrations/manus/manus-service";
import { formatContentType, formatDateTime, formatFileSize } from "@/lib/formatters";
import { toPublicFileUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

type ContentTab = "summary" | "assets" | "video" | "publishing" | "schedule" | "logs";

const tabs: Array<{ id: ContentTab; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: "summary", label: "Resumo", icon: LayoutList },
  { id: "assets", label: "Assets", icon: ImageIcon },
  { id: "video", label: "Video", icon: FileVideo },
  { id: "publishing", label: "Publicacao", icon: RadioTower },
  { id: "schedule", label: "Agenda", icon: CalendarClock },
  { id: "logs", label: "Logs", icon: ScrollText },
];

function getLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function decodeFeedbackMessage(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  try {
    return getDisplaySafeMessage(decodeURIComponent(value), fallback);
  } catch {
    return fallback;
  }
}

function getTabHref(contentId: string, tab: ContentTab) {
  return `/contents/${contentId}?tab=${tab}`;
}

function renderJobRunStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return "Concluido";
    case "FAILED":
      return "Falhou";
    case "RUNNING":
      return "Em execucao";
    default:
      return "Na fila";
  }
}

export default async function ContentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    generated?: string;
    manus?: string;
    manusPending?: string;
    manusError?: string;
    publishedPlatform?: string;
    publishError?: string;
    error?: string;
    captionSaved?: string;
    scheduleError?: string;
    videoWarning?: string;
    tab?: ContentTab;
  }>;
}) {
  const { id } = await params;
  const feedback = await searchParams;
  const user = await requireUser();
  const content = await getContentById(id, user.id);
  const socialAccounts = await getConnectedSocialAccounts();

  if (!content) {
    notFound();
  }

  const activeTab = tabs.some((tab) => tab.id === feedback.tab) ? feedback.tab! : "summary";
  const images = content.mediaFiles.filter((asset) => asset.type === "IMAGE");
  const audio = [...content.mediaFiles].reverse().find((asset) => asset.type === "AUDIO");
  const subtitles = content.mediaFiles.filter((asset) => asset.type === "SUBTITLE");
  const generatedVideo = content.generatedVideos.at(0);
  const videoPath = generatedVideo?.path;
  const videoUrl = videoPath ? toPublicFileUrl(videoPath) : null;
  const isGenerationLocked = content.status === "PROCESSING";
  const today = getLocalDateInputValue(new Date());
  const manusPlan = await readStoredManusPlan(content.id);
  const latestRun = content.assetGenerationRuns.at(0);
  const missingAssets = getMissingAssets(latestRun?.missingAssets);
  const isMissingMedia = missingAssets.images || missingAssets.audio;
  const manualActionRequired = latestRun?.status === "MANUAL_ACTION_REQUIRED";
  const runSummaryMessage = latestRun
    ? getRunSummaryMessage(
        latestRun.summary,
        "O provedor retornou detalhes internos. Revise o status e complete com upload manual se necessario.",
      )
    : null;
  const contentErrorMessage = content.errorMessage
    ? getDisplaySafeMessage(
        content.errorMessage,
        content.status === "ERROR"
          ? "Nao foi possivel concluir a geracao. Revise os arquivos enviados e tente novamente."
          : "O video foi gerado, mas a sincronizacao da legenda pode estar aproximada. Revise antes de publicar.",
      )
    : null;
  const shouldReviewCaption =
    Boolean(content.caption) &&
    (content.errorMessage === CAPTION_SYNC_WARNING ||
      content.errorMessage?.toLowerCase().includes("legenda"));
  const shouldAutoSyncManus = latestRun?.provider === "MANUS" && latestRun.status === "RUNNING";
  const instagramAccounts = socialAccounts.filter(
    (account) => account.platform === "INSTAGRAM" && account.isActive && !account.reauthRequired,
  );
  const tiktokAccounts = socialAccounts.filter(
    (account) => account.platform === "TIKTOK" && account.isActive && !account.reauthRequired,
  );
  const youtubeAccounts = socialAccounts.filter(
    (account) => account.platform === "YOUTUBE" && account.isActive && !account.reauthRequired,
  );
  const publishedPlatformLabel =
    feedback.publishedPlatform === "INSTAGRAM"
      ? "Instagram"
      : feedback.publishedPlatform === "TIKTOK"
        ? "TikTok"
        : feedback.publishedPlatform === "YOUTUBE"
          ? "YouTube"
          : null;
  const hasConnectedAccount =
    instagramAccounts.length + tiktokAccounts.length + youtubeAccounts.length > 0;
  const isReadyToPublish = Boolean(videoUrl) && hasConnectedAccount;
  const readinessItems = [
    {
      label: "Imagens",
      value:
        images.length >= 8 && images.length <= 10
          ? `${images.length} prontas`
          : `${images.length}/8-10`,
      ok: images.length >= 8 && images.length <= 10,
    },
    {
      label: "Audio",
      value: audio ? audio.originalName : "faltando",
      ok: Boolean(audio),
    },
    {
      label: "Video",
      value: videoUrl ? "MP4 pronto" : "pendente",
      ok: Boolean(videoUrl),
    },
    {
      label: "Conta conectada",
      value: hasConnectedAccount ? `${socialAccounts.length} disponiveis` : "nenhuma",
      ok: hasConnectedAccount,
    },
    {
      label: "Pronto para publicar",
      value: isReadyToPublish ? "sim" : "nao",
      ok: isReadyToPublish,
    },
  ];

  return (
    <AppShell>
      <ManusSyncMonitor contentId={content.id} active={shouldAutoSyncManus} />
      <SocialAccountPreferenceApplier />
      <div className="space-y-6">
        <Link
          href="/contents"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Voltar para conteudos
        </Link>

        {feedback.created ? (
          <FeedbackBanner
            type="success"
            title="Projeto salvo"
            message="As midias foram enviadas e vinculadas ao projeto."
          />
        ) : null}

        {feedback.generated ? (
          <FeedbackBanner
            type="success"
            title="Video gerado"
            message="O MP4 vertical foi salvo e ja pode ser revisado ou baixado."
          />
        ) : null}

        {feedback.manus ? (
          <FeedbackBanner
            type="success"
            title="Assets processados por IA"
            message="A Manus gerou e salvou o plano, as imagens e o audio retornados para este projeto."
          />
        ) : null}

        {feedback.manusPending ? (
          <FeedbackBanner
            type="info"
            title="Manus ainda esta processando"
            message="A task ainda nao terminou na Manus. Aguarde mais um pouco e clique em sincronizar novamente."
          />
        ) : null}

        {feedback.manusError ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel gerar assets automaticamente"
            message={decodeFeedbackMessage(
              feedback.manusError,
              "Nao foi possivel gerar assets automaticamente. Revise a configuracao da Manus e complete com upload manual.",
            )}
          />
        ) : null}

        {publishedPlatformLabel ? (
          <FeedbackBanner
            type="success"
            title={`Publicado no ${publishedPlatformLabel}`}
            message={`O video foi enviado para a conta conectada do ${publishedPlatformLabel}.`}
          />
        ) : null}

        {feedback.publishError ? (
          <FeedbackBanner
            type="error"
            title="Falha ao publicar"
            message={decodeFeedbackMessage(
              feedback.publishError,
              "Nao foi possivel publicar na rede selecionada agora.",
            )}
          />
        ) : null}

        {feedback.error ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel concluir a acao"
            message={decodeFeedbackMessage(
              feedback.error,
              "Nao foi possivel concluir a acao. Revise os dados e tente novamente.",
            )}
          />
        ) : null}

        {feedback.videoWarning ? (
          <FeedbackBanner
            type="info"
            title="Assets salvos, video pendente"
            message={decodeFeedbackMessage(
              feedback.videoWarning,
              "Os assets foram salvos, mas o video ainda precisa de revisao.",
            )}
          />
        ) : null}

        {feedback.captionSaved ? (
          <FeedbackBanner
            type="success"
            title="Legenda revisada"
            message="A legenda revisada foi salva para este conteudo."
          />
        ) : null}

        {feedback.scheduleError ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel salvar o agendamento"
            message={decodeFeedbackMessage(
              feedback.scheduleError,
              "Escolha uma data e horario futuros para salvar o agendamento.",
            )}
          />
        ) : null}

        {contentErrorMessage ? (
          <FeedbackBanner
            type={content.status === "ERROR" ? "error" : "info"}
            title={content.status === "ERROR" ? "Geracao com erro" : "Revise a legenda"}
            message={contentErrorMessage}
          />
        ) : null}

        {isGenerationLocked ? (
          <FeedbackBanner
            type="info"
            title="Geracao em andamento"
            message="Ja existe uma geracao em andamento para este projeto. Aguarde a conclusao antes de tentar novamente."
          />
        ) : null}

        {isMissingMedia ? (
          <FeedbackBanner
            type="info"
            title="Assets incompletos"
            message={`O provedor de IA gerou texto, mas faltou ${missingAssets.images ? "imagens" : ""}${missingAssets.images && missingAssets.audio ? " e " : ""}${missingAssets.audio ? "audio" : ""}. Complete manualmente enviando os arquivos ou gere novamente.`}
          />
        ) : null}

        {manualActionRequired ? (
          <FeedbackBanner
            type="info"
            title="Acao manual necessaria"
            message="O provedor de IA pausou o processo solicitando interacao manual. Verifique sua conta no provedor."
          />
        ) : null}

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
                  Revisao
                </p>
                <StatusBadge status={content.status} />
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                {content.title}
              </h1>
              <p className="mt-2 text-sm font-medium text-zinc-500">
                {formatContentType(content.contentType)} · criado em{" "}
                {content.createdAt.toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <Link
                href={`/contents/new?duplicate=${content.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-stone-100"
              >
                Duplicar projeto
              </Link>
              {videoUrl ? (
                <a
                  href={`${videoUrl}?download=1`}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  <Download size={16} />
                  Baixar video
                </a>
              ) : null}
              <Link
                href={getTabHref(content.id, "schedule")}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-stone-100"
              >
                <CalendarClock size={16} />
                Abrir agenda
              </Link>
              <form action={generateContentVideoAction.bind(null, content.id)}>
                <GenerateVideoButton hasVideo={Boolean(videoUrl)} locked={isGenerationLocked} />
              </form>
              <DeleteContentButton contentId={content.id} />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {readinessItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border p-4 ${
                  item.ok ? "border-emerald-200 bg-emerald-50" : "border-stone-200 bg-stone-50"
                }`}
              >
                <p className="text-sm font-medium text-zinc-500">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-zinc-950">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;

            return (
              <Link
                key={tab.id}
                href={getTabHref(content.id, tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-zinc-950 text-white"
                    : "border border-stone-300 bg-white text-zinc-900 hover:bg-stone-100"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {activeTab === "summary" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md bg-stone-50 p-4">
                  <h2 className="text-sm font-semibold">Prompt</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{content.prompt}</p>
                </div>
                <div className="rounded-md bg-stone-50 p-4">
                  <h2 className="text-sm font-semibold">Legenda base</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                    {content.caption || "Sem legenda definida."}
                  </p>
                </div>
              </div>

              {manusPlan ? (
                <div className="space-y-4 border-t border-stone-200 pt-5">
                  <div>
                    <h2 className="text-sm font-semibold">Roteiro Manus</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {typeof manusPlan.script === "string"
                        ? manusPlan.script
                        : "Sem roteiro estruturado salvo."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-md bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold">Caption da postagem</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                        {typeof manusPlan.caption === "string"
                          ? manusPlan.caption
                          : "Sem caption estruturada salva."}
                      </p>
                    </div>
                    <div className="rounded-md bg-stone-50 p-4">
                      <h3 className="text-sm font-semibold">Hashtags</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        {Array.isArray(manusPlan.hashtags) ? manusPlan.hashtags.join(" ") : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="space-y-5">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Panorama rapido</h2>
                <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-600">
                  <p>{images.length} imagens salvas no projeto.</p>
                  <p>{audio ? "Audio presente." : "Audio ainda nao enviado."}</p>
                  <p>{subtitles.length > 0 ? "Legenda de apoio ja gerada." : "Sem arquivo de legenda salvo."}</p>
                  <p>{videoUrl ? "Video pronto para baixar, agendar e publicar." : "Video ainda precisa ser renderizado."}</p>
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Legenda</h2>
                <div className="mt-3">
                  {shouldReviewCaption && content.caption ? (
                    <CaptionReviewForm contentId={content.id} caption={content.caption} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                      {content.caption || "Sem legenda definida."}
                    </p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {activeTab === "assets" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              {latestRun ? (
                <>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
                        Geracao de assets
                      </p>
                      <h2 className="mt-2 text-xl font-semibold">
                        {latestRun.provider === "MANUS" ? "Manus" : latestRun.provider}
                      </h2>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-zinc-700">
                      {formatAssetRunStatus(latestRun.status)}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 border-t border-stone-200 pt-5 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-zinc-500">Provedor</dt>
                      <dd className="mt-1 font-medium">
                        {latestRun.provider === "MANUS" ? "Manus" : latestRun.provider}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Task ID</dt>
                      <dd className="mt-1 font-medium">{maskProviderTaskId(latestRun.providerTaskId)}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Iniciado em</dt>
                      <dd className="mt-1 font-medium">{latestRun.startedAt.toLocaleString("pt-BR")}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Finalizado em</dt>
                      <dd className="mt-1 font-medium">
                        {latestRun.finishedAt ? latestRun.finishedAt.toLocaleString("pt-BR") : "em aberto"}
                      </dd>
                    </div>
                  </dl>

                  {runSummaryMessage ? (
                    <p className="mt-4 rounded-md bg-stone-50 p-4 text-sm leading-6 text-zinc-600">
                      {runSummaryMessage}
                    </p>
                  ) : null}

                  {latestRun.status === "RUNNING" && latestRun.provider === "MANUS" ? (
                    <form action={syncManusAssetsAction.bind(null, content.id)} className="mt-4">
                      <SubmitButton pendingLabel="Sincronizando assets..." icon="wand">
                        Sincronizar assets da Manus
                      </SubmitButton>
                    </form>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-zinc-500">Nenhuma tentativa automatica registrada ainda.</p>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Midias enviadas</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ImageIcon size={16} className="text-teal-700" />
                      {images.length} imagens
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {images.map((image) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={image.id}
                          src={toPublicFileUrl(image.path)}
                          alt={image.originalName}
                          className="aspect-square rounded-md object-cover"
                        />
                      ))}
                    </div>
                  </div>

                  {audio ? (
                    <div className="border-t border-stone-200 pt-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Music2 size={16} className="text-teal-700" />
                        Audio principal
                      </div>
                      <div className="mb-3 rounded-md bg-stone-50 p-3 text-sm">
                        <p className="font-medium text-zinc-900">{audio.originalName}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {audio.format.toUpperCase()} · {formatFileSize(audio.size)}
                        </p>
                      </div>
                      <audio controls src={toPublicFileUrl(audio.path)} className="w-full" />
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Prompts estruturados</h2>
                <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-600">
                  {(Array.isArray(manusPlan?.sceneIdeas) ? manusPlan.sceneIdeas : []).map((idea) => (
                    <p key={idea}>{idea}</p>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {activeTab === "video" ? (
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Video gerado</h2>
              {generatedVideo ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-zinc-600">
                  <FileVideo size={14} />
                  {generatedVideo.resolution}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex justify-center rounded-lg bg-zinc-950 p-4">
              {videoUrl ? (
                <video
                  controls
                  src={videoUrl}
                  className="aspect-[9/16] max-h-[720px] w-full max-w-[405px] rounded-md bg-black"
                />
              ) : (
                <div className="flex aspect-[9/16] max-h-[720px] w-full max-w-[405px] items-center justify-center rounded-md border border-dashed border-white/25 px-8 text-center text-sm leading-6 text-white/70">
                  Gere o MP4 para visualizar e baixar o video vertical.
                </div>
              )}
            </div>

            {generatedVideo ? (
              <dl className="mt-5 grid gap-3 border-t border-stone-200 pt-5 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-zinc-500">Status do video</dt>
                  <dd className="mt-1 font-medium">{generatedVideo.status.toLowerCase()}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Duracao</dt>
                  <dd className="mt-1 font-medium">
                    {generatedVideo.duration ? `${generatedVideo.duration}s` : "Nao informada"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Resolucao</dt>
                  <dd className="mt-1 font-medium">{generatedVideo.resolution}</dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}

        {activeTab === "publishing" ? (
          <section className="grid gap-5 xl:grid-cols-3">
            <ImmediatePublishingCard
              title="Instagram Reels"
              badge="publicacao direta"
              platform="INSTAGRAM"
              accounts={instagramAccounts}
              contentId={content.id}
              videoReady={Boolean(videoUrl)}
              defaultCaption={content.caption || ""}
              pendingLabel="Publicando no Instagram..."
            />
            <ImmediatePublishingCard
              title="TikTok"
              badge="upload direto"
              platform="TIKTOK"
              accounts={tiktokAccounts}
              contentId={content.id}
              videoReady={Boolean(videoUrl)}
              defaultCaption={content.caption || ""}
              pendingLabel="Publicando no TikTok..."
              visibilityOptions={[
                { value: "SELF_ONLY", label: "Somente eu" },
                { value: "MUTUAL_FOLLOW_FRIENDS", label: "Amigos mutuos" },
                { value: "FOLLOWER_OF_CREATOR", label: "Seguidores" },
                { value: "PUBLIC_TO_EVERYONE", label: "Publico" },
              ]}
            />
            <ImmediatePublishingCard
              title="YouTube Shorts"
              badge="upload auditavel"
              platform="YOUTUBE"
              accounts={youtubeAccounts}
              contentId={content.id}
              videoReady={Boolean(videoUrl)}
              defaultCaption={content.caption || ""}
              pendingLabel="Publicando no YouTube..."
              visibilityOptions={[
                { value: "private", label: "Privado" },
                { value: "unlisted", label: "Nao listado" },
                { value: "public", label: "Publico" },
              ]}
            />
          </section>
        ) : null}

        {activeTab === "schedule" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Agendar postagem</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Salve plataforma, conta, data, horario e caption. A publicacao sera tentada quando o agendamento for processado.
              </p>
              <form action={schedulePostAction} className="mt-4 space-y-4">
                <input type="hidden" name="projectId" value={content.id} />

                <div>
                  <label htmlFor="platform" className="text-sm font-medium text-zinc-800">
                    Plataforma
                  </label>
                  <select
                    id="schedule-platform"
                    name="platform"
                    disabled={!videoUrl}
                    defaultValue="INSTAGRAM"
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
                  >
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="YOUTUBE">YouTube</option>
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="text-sm font-medium text-zinc-800">
                      Data
                    </label>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      min={today}
                      required
                      disabled={!videoUrl}
                      className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="time" className="text-sm font-medium text-zinc-800">
                      Horario
                    </label>
                    <input
                      id="time"
                      name="time"
                      type="time"
                      required
                      disabled={!videoUrl}
                      className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="social-account" className="text-sm font-medium text-zinc-800">
                    Conta conectada
                  </label>
                  <select
                    id="schedule-social-account"
                    name="socialAccountId"
                    disabled={!videoUrl}
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
                  >
                    <option value="">Escolher depois</option>
                    {socialAccounts.filter((account) => account.isActive).map((account) => (
                      <option
                        key={account.id}
                        value={account.id}
                        data-platform={account.platform}
                      >
                        {account.platformLabel} · {account.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="schedule-visibility" className="text-sm font-medium text-zinc-800">
                    Visibilidade / privacidade
                  </label>
                  <select
                    id="schedule-visibility"
                    name="visibility"
                    disabled={!videoUrl}
                    defaultValue="private"
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
                  >
                    <option value="private">Privado</option>
                    <option value="unlisted">Nao listado</option>
                    <option value="public">Publico</option>
                    <option value="SELF_ONLY">TikTok · somente eu</option>
                    <option value="MUTUAL_FOLLOW_FRIENDS">TikTok · amigos mutuos</option>
                    <option value="FOLLOWER_OF_CREATOR">TikTok · seguidores</option>
                    <option value="PUBLIC_TO_EVERYONE">TikTok · publico</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="post-caption" className="text-sm font-medium text-zinc-800">
                    Caption da postagem
                  </label>
                  <textarea
                    id="post-caption"
                    name="caption"
                    rows={4}
                    required
                    disabled={!videoUrl}
                    defaultValue={content.caption || ""}
                    placeholder="Texto da postagem nas redes sociais."
                    className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6 disabled:bg-stone-100 disabled:text-zinc-400"
                  />
                </div>

                <SubmitButton
                  disabled={!videoUrl}
                  fullWidth
                  icon="calendar"
                  pendingLabel="Salvando agendamento..."
                >
                  Salvar agendamento
                </SubmitButton>
              </form>
            </section>

            <aside className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Ultimos agendamentos</h2>
              <div className="mt-4 space-y-4">
                {content.scheduledPosts.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum agendamento salvo ainda.</p>
                ) : (
                  content.scheduledPosts.map((post) => (
                    <div key={post.id} className="rounded-lg border border-stone-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          {post.platform.toLowerCase()}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          {post.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-zinc-900">
                        {formatDateTime(post.scheduledAt).date} {formatDateTime(post.scheduledAt).time}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {post.socialAccount?.accountName ?? "Conta nao definida"}
                      </p>
                      {post.publishErrorMessage ? (
                        <p className="mt-2 text-xs text-red-700">{post.publishErrorMessage}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "logs" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Job runs recentes</h2>
              <div className="mt-4 space-y-4">
                {content.jobRuns.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhum job run registrado ainda.</p>
                ) : (
                  content.jobRuns.map((jobRun) => (
                    <article key={jobRun.id} className="rounded-lg border border-stone-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          {jobRun.name}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                          {renderJobRunStatus(jobRun.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {jobRun.createdAt.toLocaleString("pt-BR")}
                      </p>
                      {jobRun.errorMessage ? (
                        <p className="mt-2 text-sm text-red-700">{jobRun.errorMessage}</p>
                      ) : null}
                      {jobRun.logs.length > 0 ? (
                        <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
                          {jobRun.logs.map((log) => (
                            <div key={log.id} className="rounded-md bg-stone-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                {log.level}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-zinc-600">{log.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Ultima sincronizacao Manus</h2>
                <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-600">
                  <p>Status: {latestRun ? formatAssetRunStatus(latestRun.status) : "sem run"}</p>
                  <p>Task: {maskProviderTaskId(latestRun?.providerTaskId)}</p>
                  <p>{runSummaryMessage ?? "Sem resumo salvo."}</p>
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white p-5">
                <h2 className="font-semibold">Arquivos auxiliares</h2>
                <div className="mt-4 space-y-3">
                  {subtitles.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhum subtitle salvo ainda.</p>
                  ) : (
                    subtitles.map((subtitle) => (
                      <a
                        key={subtitle.id}
                        href={toPublicFileUrl(subtitle.path)}
                        className="flex items-center gap-2 rounded-md border border-stone-200 p-3 text-sm font-medium text-zinc-900 hover:bg-stone-50"
                      >
                        <FileAudio size={14} />
                        {subtitle.originalName}
                      </a>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function ImmediatePublishingCard({
  title,
  badge,
  platform,
  accounts,
  contentId,
  videoReady,
  defaultCaption,
  pendingLabel,
  visibilityOptions,
}: {
  title: string;
  badge: string;
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  accounts: Array<{ id: string; accountName: string }>;
  contentId: string;
  videoReady: boolean;
  defaultCaption: string;
  pendingLabel: string;
  visibilityOptions?: Array<{ value: string; label: string }>;
}) {
  const selectId = `${platform.toLowerCase()}-social-account`;
  const captionId = `${platform.toLowerCase()}-caption`;
  const visibilityId = `${platform.toLowerCase()}-visibility`;

  return (
    <form
      action={publishSocialNowAction.bind(null, contentId, platform)}
      className="space-y-4 rounded-lg border border-stone-200 bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
          {badge}
        </span>
      </div>

      <div>
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-800">
          Conta conectada
        </label>
        <select
          id={selectId}
          name="socialAccountId"
          data-social-platform={platform}
          disabled={!videoReady || accounts.length === 0}
          className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
        >
          <option value="">Selecione</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountName}
            </option>
          ))}
        </select>
      </div>

      {visibilityOptions ? (
        <div>
          <label htmlFor={visibilityId} className="text-sm font-medium text-zinc-800">
            Visibilidade
          </label>
          <select
            id={visibilityId}
            name="visibility"
            disabled={!videoReady || accounts.length === 0}
            defaultValue={visibilityOptions[0]?.value}
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm disabled:bg-stone-100 disabled:text-zinc-400"
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor={captionId} className="text-sm font-medium text-zinc-800">
          Legenda
        </label>
        <textarea
          id={captionId}
          name="caption"
          rows={4}
          required
          disabled={!videoReady || accounts.length === 0}
          defaultValue={defaultCaption}
          className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6 disabled:bg-stone-100 disabled:text-zinc-400"
        />
      </div>

      <SubmitButton
        disabled={!videoReady || accounts.length === 0}
        fullWidth
        icon="wand"
        pendingLabel={pendingLabel}
      >
        Publicar agora
      </SubmitButton>

      {!videoReady ? (
        <p className="text-xs leading-5 text-zinc-500">Gere o video antes de publicar.</p>
      ) : null}
      {accounts.length === 0 ? (
        <p className="text-xs leading-5 text-zinc-500">
          Conecte uma conta em /settings para habilitar esta publicacao.
        </p>
      ) : null}
    </form>
  );
}
