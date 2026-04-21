import Link from "next/link";
import { CalendarClock, ExternalLink, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getScheduledPosts } from "@/features/schedule/queries";
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
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
  CANCELED: "Cancelado",
};

export default async function SchedulePage() {
  const scheduledPosts = await getScheduledPosts();

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
              Agenda
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Postagens agendadas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Controle dos posts planejados. O MVP apenas salva os agendamentos, sem publicar automaticamente.
            </p>
          </div>
          <Link
            href="/contents"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <PlusCircle size={18} />
            Escolher conteudo
          </Link>
        </div>

        {scheduledPosts.length === 0 ? (
          <section className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
              <CalendarClock size={22} />
            </div>
            <h2 className="mt-4 font-semibold">Nenhuma postagem agendada</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Abra um conteudo com video gerado e salve plataforma, data, horario e caption.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="divide-y divide-stone-200">
              {scheduledPosts.map((post) => {
                const videoPath = post.project.generatedVideos[0]?.path;

                return (
                  <article
                    key={post.id}
                    className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_auto] lg:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        {post.scheduledAt.toLocaleDateString("pt-BR")}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {post.scheduledAt.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
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
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                          {statusLabels[post.status]}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                        {post.caption}
                      </p>
                    </div>

                    <div className="flex gap-2 lg:justify-end">
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
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
