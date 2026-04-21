import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ImageIcon, Music2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { GenerateVideoButton } from "@/features/content/components/generate-video-button";
import { generateContentVideoAction } from "@/features/content/actions";
import { getContentById } from "@/features/content/queries";
import { toPublicFileUrl } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function ReviewContentPage({
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
  const videoPath = content.generatedVideos.at(0)?.path;
  const videoUrl = videoPath ? toPublicFileUrl(videoPath) : null;

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/contents"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft size={16} />
          Voltar ao historico
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
                  <StatusBadge status={content.status} />
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{content.prompt}</p>
              </div>
              {videoUrl ? (
                <a
                  href={`${videoUrl}?download=1`}
                  className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  <Download size={16} />
                  Baixar MP4
                </a>
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
                <div className="flex aspect-[9/16] max-h-[720px] w-full max-w-[405px] items-center justify-center rounded-md border border-dashed border-white/25 text-center text-sm text-white/70">
                  Gere o MP4 para visualizar a previa vertical.
                </div>
              )}
            </div>

            {content.errorMessage ? (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                {content.errorMessage}
              </div>
            ) : null}
          </section>

          <aside className="space-y-5">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Geracao</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                O FFmpeg cria um arquivo MP4 vertical 1080x1920 usando as imagens, o audio e a legenda.
              </p>
              <form action={generateContentVideoAction.bind(null, content.id)} className="mt-4">
                <GenerateVideoButton />
              </form>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Arquivos</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon size={16} className="text-teal-700" />
                  {images.length} imagens
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {images.slice(0, 6).map((image) => (
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
                  <div className="pt-2">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Music2 size={16} className="text-teal-700" />
                      Audio
                    </div>
                    <audio controls src={toPublicFileUrl(audio.path)} className="w-full" />
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
