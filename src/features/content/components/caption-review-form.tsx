import { SubmitButton } from "@/components/submit-button";
import { saveCaptionReviewAction } from "@/features/content/actions";

export function CaptionReviewForm({
  contentId,
  caption,
}: {
  contentId: string;
  caption: string;
}) {
  return (
    <form action={saveCaptionReviewAction.bind(null, contentId)} className="space-y-3">
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold">Revise a legenda</p>
        <p className="mt-1 leading-6 opacity-80">
          A sincronizacao da legenda pode estar aproximada. Revise o texto antes de gerar ou
          publicar.
        </p>
      </div>
      <div>
        <label htmlFor="caption-review" className="text-sm font-semibold text-zinc-800">
          Legenda revisada
        </label>
        <textarea
          id="caption-review"
          name="caption"
          rows={6}
          required
          maxLength={5000}
          defaultValue={caption}
          className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
        />
      </div>
      <SubmitButton icon="save" pendingLabel="Salvando legenda...">
        Salvar legenda revisada
      </SubmitButton>
    </form>
  );
}
