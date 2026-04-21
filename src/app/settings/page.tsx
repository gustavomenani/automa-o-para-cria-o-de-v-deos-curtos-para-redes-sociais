import { Bot, KeyRound, Settings, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SubmitButton } from "@/components/submit-button";
import { saveManusSettingsAction } from "@/features/settings/actions";
import { getManusSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const feedback = await searchParams;
  const manusSettings = await getManusSettings();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preferencias do sistema</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Prepare credenciais e padroes para a futura integracao com Manus e redes sociais.
          </p>
        </div>

        {feedback.saved ? (
          <FeedbackBanner
            type="success"
            title="Configuracoes salvas"
            message="As preferencias foram atualizadas no banco local."
          />
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
                <Bot size={20} />
              </span>
              <div>
                <h2 className="font-semibold">Manus</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Service mockado pronto para trocar pelo client real.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
                <KeyRound size={20} />
              </span>
              <div>
                <h2 className="font-semibold">API Key</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {manusSettings.hasApiKey ? "Chave cadastrada." : "Nenhuma chave cadastrada."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-stone-100 text-teal-700">
                <ShieldCheck size={20} />
              </span>
              <div>
                <h2 className="font-semibold">Redes sociais</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Publicacao externa permanece desativada neste MVP.
                </p>
              </div>
            </div>
          </div>
        </section>

        <form action={saveManusSettingsAction} className="space-y-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-teal-700" />
              <h2 className="font-semibold">Credenciais Manus</h2>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <label htmlFor="apiKey" className="text-sm font-medium text-zinc-800">
                  API Key da Manus
                </label>
                <input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder={
                    manusSettings.hasApiKey
                      ? "Chave ja cadastrada. Preencha apenas para substituir."
                      : "Cole a API key quando estiver disponivel."
                  }
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  No MVP a chave fica salva no banco local. Depois pode ser movida para secret manager.
                </p>
              </div>

              <div>
                <label htmlFor="modelPreference" className="text-sm font-medium text-zinc-800">
                  Preferencia de modelo
                </label>
                <input
                  id="modelPreference"
                  name="modelPreference"
                  defaultValue={manusSettings.modelPreference}
                  placeholder="Ex: manus-video-default"
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="promptPreference" className="text-sm font-medium text-zinc-800">
                Preferencia de prompt
              </label>
              <textarea
                id="promptPreference"
                name="promptPreference"
                rows={4}
                defaultValue={manusSettings.promptPreference}
                placeholder="Diretrizes padrao para orientar tarefas futuras da Manus."
                className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
              />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Padrao para Reels</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="reelsDuration" className="text-sm font-medium text-zinc-800">
                    Duracao padrao em segundos
                  </label>
                  <input
                    id="reelsDuration"
                    name="reelsDuration"
                    type="number"
                    min={5}
                    max={180}
                    defaultValue={manusSettings.reelsDuration}
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="reelsStyle" className="text-sm font-medium text-zinc-800">
                    Estilo padrao
                  </label>
                  <textarea
                    id="reelsStyle"
                    name="reelsStyle"
                    rows={4}
                    defaultValue={manusSettings.reelsStyle}
                    placeholder="Ex: ritmo rapido, cortes curtos, CTA final."
                    className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Padrao para Stories</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="storiesDuration" className="text-sm font-medium text-zinc-800">
                    Duracao padrao em segundos
                  </label>
                  <input
                    id="storiesDuration"
                    name="storiesDuration"
                    type="number"
                    min={3}
                    max={60}
                    defaultValue={manusSettings.storiesDuration}
                    className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="storiesStyle" className="text-sm font-medium text-zinc-800">
                    Estilo padrao
                  </label>
                  <textarea
                    id="storiesStyle"
                    name="storiesStyle"
                    rows={4}
                    defaultValue={manusSettings.storiesStyle}
                    placeholder="Ex: tela direta, copy curta, chamada para responder."
                    className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <SubmitButton icon="save" pendingLabel="Salvando configuracoes...">
              Salvar configuracoes
            </SubmitButton>
          </div>
        </form>

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
