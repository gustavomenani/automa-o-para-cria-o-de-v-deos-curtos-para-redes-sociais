import { Bot, KeyRound, Settings, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { SubmitButton } from "@/components/submit-button";
import {
  disconnectSocialAccountAction,
  saveManusSettingsAction,
  validateSocialAccountAction,
} from "@/features/settings/actions";
import { SocialAccountDefaults } from "@/features/settings/components/social-account-defaults";
import {
  getConnectedSocialAccounts,
  getEnvironmentHealth,
  getManusSettings,
} from "@/features/settings/queries";
import { requireUser } from "@/features/auth/session";

export const dynamic = "force-dynamic";

function decodeFeedbackMessage(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    settingsError?: string;
    instagramConnected?: string;
    tiktokConnected?: string;
    youtubeConnected?: string;
    socialDisconnected?: string;
    socialValidated?: string;
    socialError?: string;
  }>;
}) {
  const feedback = await searchParams;
  const socialErrorMessage = decodeFeedbackMessage(feedback.socialError);
  const settingsErrorMessage = decodeFeedbackMessage(feedback.settingsError);
  await requireUser();
  const manusSettings = await getManusSettings();
  const socialAccounts = await getConnectedSocialAccounts();
  const healthChecks = await getEnvironmentHealth();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
            Configuracoes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preferencias do sistema</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Configure credenciais server-side para Manus e padroes usados na geracao de assets.
            A geracao automatica depende da Manus e mantem as credenciais isoladas no servidor.
          </p>
        </div>

        {feedback.saved ? (
          <FeedbackBanner
            type="success"
            title="Configuracoes salvas"
            message="As preferencias foram atualizadas no banco local."
          />
        ) : null}

        {settingsErrorMessage ? (
          <FeedbackBanner
            type="error"
            title="Nao foi possivel salvar configuracoes"
            message={settingsErrorMessage}
          />
        ) : null}

        {feedback.youtubeConnected ? (
          <FeedbackBanner
            type="success"
            title="Conta conectada"
            message="A conta do YouTube foi conectada e esta pronta para uploads auditaveis."
          />
        ) : null}

        {feedback.instagramConnected ? (
          <FeedbackBanner
            type="success"
            title="Conta conectada"
            message="A conta do Instagram foi conectada e esta pronta para publicar Reels."
          />
        ) : null}

        {feedback.tiktokConnected ? (
          <FeedbackBanner
            type="success"
            title="Conta conectada"
            message="A conta do TikTok foi conectada e esta pronta para publicacao direta."
          />
        ) : null}

        {feedback.socialDisconnected ? (
          <FeedbackBanner
            type="success"
            title="Conta desconectada"
            message="Os tokens foram removidos e a conta foi marcada para nova autenticacao."
          />
        ) : null}

        {feedback.socialValidated ? (
          <FeedbackBanner
            type="success"
            title="Conta validada"
            message="A conta foi reavaliada com base no token salvo e no estado atual do cadastro."
          />
        ) : null}

        {socialErrorMessage ? (
          <FeedbackBanner
            type="error"
            title="Falha ao conectar conta"
            message={socialErrorMessage}
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
                  Integracao principal para roteiro, imagens e audio no fluxo automatico.
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
                  OAuth oficial, tokens cifrados e publicacao real para Instagram, TikTok e
                  YouTube.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="font-semibold">Contas sociais conectadas</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Base audit-ready com OAuth oficial, escopos minimos, tokens cifrados e trilha de
                reconexao. Instagram, TikTok e YouTube usam a mesma infraestrutura.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/oauth/instagram/start"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-stone-100"
              >
                Conectar Instagram
              </a>
              <a
                href="/api/oauth/tiktok/start"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-stone-100"
              >
                Conectar TikTok
              </a>
              <a
                href="/api/oauth/youtube/start"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Conectar YouTube
              </a>
            </div>
          </div>

          {socialAccounts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Nenhuma conta conectada ainda.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {socialAccounts.map((account) => (
                <article
                  key={account.id}
                  className="flex flex-col justify-between gap-4 rounded-lg border border-stone-200 p-4 md:flex-row md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{account.accountName}</h3>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {account.platformLabel}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {account.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      {account.reauthRequired
                        ? "Exige nova autenticacao."
                        : account.tokenExpiresAt
                          ? `Token expira em ${account.tokenExpiresAt.toLocaleString("pt-BR")}.`
                          : "Token sem expiracao conhecida."}
                    </p>
                    {account.lastValidatedAt ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Ultima validacao: {account.lastValidatedAt.toLocaleString("pt-BR")}
                      </p>
                    ) : null}
                    {Array.isArray(account.scopes) && account.scopes.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {account.scopes.map((scope) => (
                          <span
                            key={String(scope)}
                            className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                          >
                            {String(scope)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {account.tokenErrorMessage ? (
                      <p className="mt-1 text-sm text-red-700">{account.tokenErrorMessage}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <form action={validateSocialAccountAction}>
                      <input type="hidden" name="socialAccountId" value={account.id} />
                      <SubmitButton pendingLabel="Validando..." variant="secondary">
                        Validar conta
                      </SubmitButton>
                    </form>
                    <form action={disconnectSocialAccountAction}>
                      <input type="hidden" name="socialAccountId" value={account.id} />
                      <SubmitButton pendingLabel="Desconectando..." variant="secondary">
                        Desconectar
                      </SubmitButton>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <SocialAccountDefaults accounts={socialAccounts} />

        <form action={saveManusSettingsAction} className="space-y-6">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-teal-700" />
              <div>
                <h2 className="font-semibold">Configuracao basica</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Mantem a chave da Manus, o modelo preferido e as diretrizes principais de geracao.
                </p>
              </div>
            </div>
          </section>

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
                      ? "Chave já cadastrada. Preencha apenas para substituir."
                      : "Insira a chave da API da Manus."
                  }
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  A chave e usada somente no servidor. No MVP fica salva no banco local; em
                  producao, mova para secret manager.
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Para rotacao segura, preencha uma nova chave apenas quando quiser substituir a atual.
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

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-teal-700" />
              <div>
                <h2 className="font-semibold">Configuracao avancada</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Ajusta duracao e estilo base por formato e impacta a orientacao passada para a Manus.
                </p>
              </div>
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
            <h2 className="font-semibold">Health check do ambiente</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {healthChecks.map((check) => (
              <div key={check.label} className="rounded-lg border border-stone-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-900">{check.label}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      check.ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {check.ok ? "OK" : "Ajustar"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
