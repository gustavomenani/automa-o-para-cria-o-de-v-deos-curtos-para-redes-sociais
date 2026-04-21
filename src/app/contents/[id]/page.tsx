import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Download,
  FileVideo,
  ImageIcon,
  Music2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { GenerateVideoButton } from "@/features/content/components/generate-video-button";
import { generateContentVideoAction } from "@/features/content/actions";
import { getContentById } from "@/features/content/queries";
import { toPublicFileUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

function formatContentType(contentType: string) {
  return contentType.toLowerCase().replace("_", " ");
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(size / 1024, 1).toFixed(0)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default async function ContentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const content = await getContentById(id);

  if (!content) {
    notFound();
  }

  const images = content.mediaFiles.filter((asset) => asset.type === "IMAGE");
  const audio = content.mediaFiles.find((asset) => asset.type === "AUDIO");
  const generatedVideo = content.generatedVideos.at(0);
  const videoPath = generatedVideo?.path;
  const videoUrl = videoPath ? toPublicFileUrl(videoPath) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/contents"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Voltar para conteudos
        </Link>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
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

            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
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
                href="/schedule"
                aria-disabled={!videoUrl}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold ${
                  videoUrl
                    ? "border border-stone-300 bg-white text-zinc-900 hover:bg-stone-100"
                    : "pointer-events-none border border-stone-200 bg-stone-100 text-zinc-400"
                }`}
              >
                <CalendarClock size={16} />
                Agendar postagem
              </Link>
              <form action={generateContentVideoAction.bind(null, content.id)}>
                <GenerateVideoButton hasVideo={Boolean(videoUrl)} />
              </form>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-stone-50 p-4">
                <h2 className="text-sm font-semibold">Prompt</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{content.prompt}</p>
              </div>
              <div className="rounded-md bg-stone-50 p-4">
                <h2 className="text-sm font-semibold">Legenda</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {content.caption || "Sem legenda definida."}
                </p>
              </div>
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

            {content.errorMessage ? (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                {content.errorMessage}
              </div>
            ) : null}

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

          <aside className="space-y-5">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Midias enviadas</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon size={16} className="text-teal-700" />
                  {images.length} imagens
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3">
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

                {audio ? (
                  <div className="border-t border-stone-200 pt-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Music2 size={16} className="text-teal-700" />
                      Audio
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
              <h2 className="font-semibold">Legenda</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                {content.caption || "Sem legenda definida."}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
