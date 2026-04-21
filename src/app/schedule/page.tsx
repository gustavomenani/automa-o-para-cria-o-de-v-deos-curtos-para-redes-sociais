import { CalendarClock, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function SchedulePage() {
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
              Estrutura preparada para agendamento futuro. As integracoes sociais ainda nao estao ativas no MVP.
            </p>
          </div>
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md bg-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-500"
          >
            <PlusCircle size={18} />
            Novo agendamento
          </button>
        </div>

        <section className="rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
            <CalendarClock size={22} />
          </div>
          <h2 className="mt-4 font-semibold">Nenhuma postagem agendada</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Quando as integracoes forem ativadas, esta tela exibira plataforma, data, horario e status de cada publicacao.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
