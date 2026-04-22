import Link from "next/link";
import { CheckCircle2, Clock3, FileVideo, PlusCircle, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ContentList } from "@/features/content/components/content-list";
import { getDashboardStats } from "@/features/content/queries";
import { requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.id);

  const metricItems = [
    { label: "Total", value: stats.total, icon: FileVideo },
    { label: "Prontos", value: stats.ready, icon: CheckCircle2 },
    { label: "Rascunhos", value: stats.draft, icon: Clock3 },
    { label: "Erros", value: stats.failed, icon: XCircle },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Operacao de videos curtos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Acompanhe projetos, gere MP4s verticais e mantenha o historico centralizado.
            </p>
          </div>
          <Link
            href="/contents/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            <PlusCircle size={18} />
            Novo conteudo
          </Link>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricItems.map((item) => (
            <div key={item.label} className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-500">{item.label}</span>
                <item.icon size={18} className="text-teal-700" />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{item.value}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projetos recentes</h2>
            <Link href="/contents" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              Ver todos
            </Link>
          </div>
          <ContentList contents={stats.latest} />
        </section>
      </div>
    </AppShell>
  );
}
