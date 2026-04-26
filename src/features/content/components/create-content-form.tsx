import { createContentAction } from "@/features/content/actions";
import { SubmitButton } from "@/components/submit-button";

export function CreateContentForm() {
  return (
    <form action={createContentAction} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-5">
          <div className="rounded-md border border-teal-100 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal-950">
              Fluxo automatico Manus-only
            </p>
            <p className="mt-2 text-sm leading-6 text-teal-900/80">
              Preencha o prompt e gere assets com Manus. A geracao automatica espera roteiro,
              imagens e audio vindos da Manus; sem fallback para outro provedor.
            </p>
            <p className="mt-2 text-sm leading-6 text-teal-900/80">
              As chaves ficam somente no servidor, configuradas via .env ou /settings.
            </p>
          </div>

          <div>
            <label htmlFor="title" className="text-sm font-medium text-zinc-800">
              Titulo interno
            </label>
            <input
              id="title"
              name="title"
              required
              minLength={2}
              placeholder="Ex: Campanha produto A"
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="prompt" className="text-sm font-medium text-zinc-800">
              Prompt
            </label>
            <textarea
              id="prompt"
              name="prompt"
              required
              rows={5}
              placeholder="Descreva o roteiro, estilo visual, ritmo e objetivo do conteudo."
              className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
            />
          </div>

          <div>
            <label htmlFor="contentType" className="text-sm font-medium text-zinc-800">
              Tipo de conteudo
            </label>
            <select
              id="contentType"
              name="contentType"
              defaultValue="REELS"
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="REELS">Reels</option>
              <option value="STORY">Story</option>
              <option value="TIKTOK">TikTok</option>
              <option value="YOUTUBE_SHORTS">YouTube Shorts</option>
            </select>
          </div>

          <div>
            <label htmlFor="caption" className="text-sm font-medium text-zinc-800">
              Legenda
            </label>
            <textarea
              id="caption"
              name="caption"
              rows={4}
              placeholder="Texto opcional para aparecer no video."
              className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
            />
          </div>
        </section>

        <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-5">
          <p className="rounded-md bg-stone-50 p-3 text-xs leading-5 text-zinc-600">
            Aceitamos PNG, JPG ou WebP para imagens e MP3, WAV ou M4A para audio, dentro dos
            limites do sistema.
          </p>

          <div>
            <label htmlFor="images" className="text-sm font-medium text-zinc-800">
              Imagens
            </label>
            <input
              id="images"
              name="images"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Opcional. Use upload manual se preferir complementar ou substituir os assets
              gerados pela Manus.
            </p>
          </div>

          <div>
            <label htmlFor="audio" className="text-sm font-medium text-zinc-800">
              Audio
            </label>
            <input
              id="audio"
              name="audio"
              type="file"
              accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Opcional. MP3, WAV ou M4A para complementar ou substituir o audio gerado.
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        <SubmitButton
          name="intent"
          value="manus"
          pendingLabel="Gerando com IA..."
          icon="wand"
        >
          Gerar assets com Manus
        </SubmitButton>
        <SubmitButton
          name="intent"
          value="save"
          pendingLabel="Salvando..."
          icon="save"
          variant="secondary"
        >
          Salvar projeto
        </SubmitButton>
        <SubmitButton
          name="intent"
          value="generate"
          pendingLabel="Salvando e gerando..."
          icon="wand"
          variant="secondary"
        >
          Salvar e completar com uploads
        </SubmitButton>
      </div>
    </form>
  );
}
