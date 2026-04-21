import type { ProjectStatus } from "@prisma/client";

const statusMap: Record<ProjectStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  READY: "bg-emerald-100 text-emerald-800",
  ERROR: "bg-red-100 text-red-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  PUBLISHED: "bg-zinc-200 text-zinc-800",
};

const labelMap: Record<ProjectStatus, string> = {
  DRAFT: "Rascunho",
  PROCESSING: "Processando",
  READY: "Pronto",
  ERROR: "Erro",
  SCHEDULED: "Agendado",
  PUBLISHED: "Publicado",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusMap[status]}`}>
      {labelMap[status]}
    </span>
  );
}
