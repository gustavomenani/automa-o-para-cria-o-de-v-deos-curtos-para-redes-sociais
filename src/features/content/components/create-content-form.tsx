import { createContentAction } from "@/features/content/actions";
import { Save, Wand2 } from "lucide-react";

export function CreateContentForm() {
  return (
    <form action={createContentAction} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-5">
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
              required
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-2 text-xs text-zinc-500">Use imagens verticais ou quadradas para melhor corte.</p>
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
              required
              className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-2 text-xs text-zinc-500">MP3, WAV ou M4A. O video usa a duracao menor entre imagem e audio.</p>
          </div>
        </section>
      </div>

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        <button
          name="intent"
          value="save"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-stone-100"
        >
          <Save size={16} />
          Salvar projeto
        </button>
        <button
          name="intent"
          value="generate"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          <Wand2 size={16} />
          Salvar e gerar video
        </button>
      </div>
    </form>
  );
}
