import Link from "next/link";
import { toPublicFileUrl } from "@/lib/paths";
import { StatusBadge } from "@/components/status-badge";
import type { ContentProjectWithRelations } from "@/features/content/types";

export function ContentList({ contents }: { contents: ContentProjectWithRelations[] }) {
  if (contents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
        <p className="font-medium text-zinc-900">Nenhum conteudo criado ainda.</p>
        <p className="mt-1 text-sm text-zinc-500">Crie o primeiro video para iniciar o historico.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="divide-y divide-stone-200">
        {contents.map((content) => (
          <div
            key={content.id}
            className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/contents/${content.id}/review`}
                  className="font-semibold text-zinc-950 hover:text-teal-700"
                >
                  {content.title}
                </Link>
                <StatusBadge status={content.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{content.prompt}</p>
              <p className="mt-2 text-xs text-zinc-400">
                {content.mediaFiles.filter((asset) => asset.type === "IMAGE").length} imagens · criado em{" "}
                {content.createdAt.toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {content.generatedVideos[0]?.path ? (
                <a
                  href={`${toPublicFileUrl(content.generatedVideos[0].path)}?download=1`}
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100"
                >
                  Baixar
                </a>
              ) : null}
              <Link
                href={`/contents/${content.id}/review`}
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Revisar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
