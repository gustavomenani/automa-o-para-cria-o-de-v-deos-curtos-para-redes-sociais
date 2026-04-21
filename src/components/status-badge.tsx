import type { ContentStatus } from "@prisma/client";

const statusMap: Record<ContentStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  PUBLISHED: "bg-zinc-200 text-zinc-800",
};

const labelMap: Record<ContentStatus, string> = {
  DRAFT: "Rascunho",
  READY: "Pronto",
  FAILED: "Falhou",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMap[status]}`}>
      {labelMap[status]}
    </span>
  );
}
