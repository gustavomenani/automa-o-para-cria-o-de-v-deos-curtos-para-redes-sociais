import { KeyRound, Settings, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function SettingsPage() {
  const sections = [
    {
      title: "Manus",
      description: "Stub reservado para credenciais e opcoes da API quando a integracao for implementada.",
      icon: KeyRound,
    },
    {
      title: "Contas sociais",
      description: "Estrutura preparada para Instagram, TikTok e YouTube sem conexao externa neste MVP.",
      icon: ShieldCheck,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preferencias do sistema</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Area preparada para futuras chaves, contas conectadas e ajustes de publicacao.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
                  <section.icon size={20} />
                </span>
                <div>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{section.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-teal-700" />
            <h2 className="font-semibold">Ambiente local</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-zinc-500">Banco</dt>
              <dd className="mt-1 font-medium">PostgreSQL via Docker</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Storage</dt>
              <dd className="mt-1 font-medium">Local</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Video</dt>
              <dd className="mt-1 font-medium">FFmpeg</dd>
            </div>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
