import { createContentAction } from "@/features/content/actions";

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
            <label htmlFor="caption" className="text-sm font-medium text-zinc-800">
              Legenda do video
            </label>
            <textarea
              id="caption"
              name="caption"
              required
              rows={6}
              placeholder="Texto que sera aplicado no video vertical."
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

      <div className="flex justify-end">
        <button className="rounded-md bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800">
          Salvar e revisar
        </button>
      </div>
    </form>
  );
}
