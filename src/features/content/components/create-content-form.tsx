"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Film, ImageIcon, Music2, Sparkles, Upload } from "lucide-react";
import { createContentAction } from "@/features/content/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatFileSize } from "@/lib/formatters";

const PROMPT_PRESETS_STORAGE_KEY = "short-video.prompt-presets";

type FormMode = "manus" | "manual";
type ContentType = "REELS" | "STORY" | "TIKTOK" | "YOUTUBE_SHORTS";

type PromptPreset = {
  id: string;
  name: string;
  prompt: string;
  caption: string;
  contentType: ContentType;
};

type CreateContentDefaults = {
  title?: string;
  prompt?: string;
  caption?: string;
  contentType?: ContentType;
  mode?: FormMode;
};

type CreateContentRecommendations = {
  reelsDuration: number;
  reelsStyle: string;
  storiesDuration: number;
  storiesStyle: string;
};

type CreateContentFormProps = {
  defaults?: CreateContentDefaults;
  recommendations: CreateContentRecommendations;
};

function readStoredPresets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(PROMPT_PRESETS_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as PromptPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredPresets(presets: PromptPreset[]) {
  window.localStorage.setItem(PROMPT_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function createPresetName(contentType: ContentType) {
  const date = new Date().toLocaleDateString("pt-BR");
  return `Preset ${contentType.toLowerCase()} ${date}`;
}

function formatDuration(durationSeconds: number | null) {
  if (!durationSeconds || Number.isNaN(durationSeconds)) {
    return "Detectando duracao...";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.round(durationSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function CreateContentForm({
  defaults,
  recommendations,
}: CreateContentFormProps) {
  const [mode, setMode] = useState<FormMode>(defaults?.mode ?? "manus");
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [prompt, setPrompt] = useState(defaults?.prompt ?? "");
  const [caption, setCaption] = useState(defaults?.caption ?? "");
  const [contentType, setContentType] = useState<ContentType>(defaults?.contentType ?? "REELS");
  const [imagePreviews, setImagePreviews] = useState<
    Array<{ name: string; size: number; url: string }>
  >([]);
  const [audioPreview, setAudioPreview] = useState<{
    name: string;
    size: number;
    durationSeconds: number | null;
  } | null>(null);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>(() => readStoredPresets());
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      setImagePreviews((current) => {
        current.forEach((preview) => URL.revokeObjectURL(preview.url));
        return current;
      });
    };
  }, []);

  const selectedGuidance = useMemo(() => {
    if (contentType === "STORY") {
      return {
        duration: recommendations.storiesDuration,
        style: recommendations.storiesStyle,
      };
    }

    return {
      duration: recommendations.reelsDuration,
      style: recommendations.reelsStyle,
    };
  }, [
    contentType,
    recommendations.reelsDuration,
    recommendations.reelsStyle,
    recommendations.storiesDuration,
    recommendations.storiesStyle,
  ]);

  function handleImagesChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImagePreviews((current) => {
      current.forEach((preview) => URL.revokeObjectURL(preview.url));
      return [];
    });

    const files = Array.from(event.target.files ?? []);
    const previews = files.map((file) => ({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setImagePreviews(previews);
  }

  function handleAudioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setAudioPreview(null);
      return;
    }

    setAudioPreview({
      name: file.name,
      size: file.size,
      durationSeconds: null,
    });

    const audioUrl = URL.createObjectURL(file);
    const audioElement = new Audio(audioUrl);
    audioElement.preload = "metadata";

    audioElement.onloadedmetadata = () => {
      setAudioPreview({
        name: file.name,
        size: file.size,
        durationSeconds: audioElement.duration,
      });
      URL.revokeObjectURL(audioUrl);
    };

    audioElement.onerror = () => {
      setAudioPreview({
        name: file.name,
        size: file.size,
        durationSeconds: null,
      });
      URL.revokeObjectURL(audioUrl);
    };
  }

  function applyPreset(preset: PromptPreset) {
    setPrompt(preset.prompt);
    setCaption(preset.caption);
    setContentType(preset.contentType);
  }

  function saveCurrentPreset() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const nextPreset: PromptPreset = {
      id: crypto.randomUUID(),
      name: createPresetName(contentType),
      prompt: trimmedPrompt,
      caption: caption.trim(),
      contentType,
    };

    const nextPresets = [nextPreset, ...promptPresets].slice(0, 8);
    setPromptPresets(nextPresets);
    saveStoredPresets(nextPresets);
  }

  function deletePreset(presetId: string) {
    const nextPresets = promptPresets.filter((preset) => preset.id !== presetId);
    setPromptPresets(nextPresets);
    saveStoredPresets(nextPresets);
  }

  const primaryIntent = mode === "manus" ? "manus" : "generate";
  const primaryLabel =
    mode === "manus" ? "Gerar assets com Manus" : "Salvar e completar com uploads";
  const primaryPendingLabel =
    mode === "manus" ? "Gerando com IA..." : "Salvando e gerando...";

  return (
    <form action={createContentAction} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("manus")}
              className={`rounded-lg border p-4 text-left transition ${
                mode === "manus"
                  ? "border-teal-300 bg-teal-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Sparkles size={16} className="text-teal-700" />
                Gerar com Manus
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Roteiro, imagens e audio saem do fluxo automatico Manus-only.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`rounded-lg border p-4 text-left transition ${
                mode === "manual"
                  ? "border-teal-300 bg-teal-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Upload size={16} className="text-teal-700" />
                Criar com uploads
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Salve o projeto e monte o video com suas imagens e seu audio.
              </p>
            </button>
          </div>

          <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              {mode === "manus" ? "Fluxo automatico Manus-only" : "Fluxo manual assistido"}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {mode === "manus"
                ? "A Manus deve devolver 8 a 10 imagens, 1 audio e um roteiro que respeite o tempo pedido no prompt, sempre ate 110 segundos."
                : "Use uploads quando voce quiser controlar os assets manualmente ou complementar o resultado automatico antes do MP4."}
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
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex: Campanha produto A"
              className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="prompt" className="text-sm font-medium text-zinc-800">
                Prompt
              </label>
              <button
                type="button"
                onClick={saveCurrentPreset}
                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                Salvar preset atual
              </button>
            </div>
            <textarea
              id="prompt"
              name="prompt"
              required
              rows={6}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Descreva o roteiro, estilo visual, ritmo, CTA e o tempo desejado do conteudo."
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
              value={contentType}
              onChange={(event) => setContentType(event.target.value as ContentType)}
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
              Legenda base
            </label>
            <textarea
              id="caption"
              name="caption"
              rows={4}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Texto opcional para aproveitar na tela e na publicacao."
              className="mt-2 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6"
            />
          </div>

          {promptPresets.length > 0 ? (
            <div className="rounded-lg border border-stone-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900">Presets salvos neste navegador</h2>
                <span className="text-xs text-zinc-500">{promptPresets.length} disponiveis</span>
              </div>
              <div className="mt-3 space-y-3">
                {promptPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{preset.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{preset.contentType}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-white"
                        >
                          Aplicar
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePreset(preset.id)}
                          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">
                      {preset.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Film size={16} className="text-teal-700" />
              <h2 className="font-semibold">Padrao operacional</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
              <li>Video final sempre vertical 9:16.</li>
              <li>Manus deve gerar entre 8 e 10 imagens.</li>
              <li>Audio unico e duracao maxima de 110 segundos.</li>
              <li>O tempo desejado deve ser explicitado no prompt.</li>
            </ul>
            <div className="mt-4 rounded-md bg-stone-50 p-3 text-sm leading-6 text-zinc-600">
              <p className="font-semibold text-zinc-900">
                Recomendacao atual para {contentType.toLowerCase()}
              </p>
              <p className="mt-2">Duracao base: {selectedGuidance.duration}s</p>
              {selectedGuidance.style ? <p className="mt-1">{selectedGuidance.style}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="text-teal-700" />
              <h2 className="font-semibold">Uploads manuais</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              PNG, JPG ou WebP para imagens. MP3, WAV ou M4A para audio.
            </p>

            <div className="mt-4">
              <label htmlFor="images" className="text-sm font-medium text-zinc-800">
                Imagens
              </label>
              <input
                ref={imageInputRef}
                id="images"
                name="images"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleImagesChange}
                className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Ordem atual: {imagePreviews.length > 0 ? `${imagePreviews.length} imagens` : "nenhuma selecionada"}
              </p>
              {imagePreviews.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imagePreviews.map((image, index) => (
                    <div key={`${image.name}-${index}`} className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.name}
                        className="aspect-square rounded-md object-cover"
                      />
                      <p className="truncate text-[11px] text-zinc-500">
                        {index + 1}. {image.name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <label htmlFor="audio" className="text-sm font-medium text-zinc-800">
                Audio
              </label>
              <input
                ref={audioInputRef}
                id="audio"
                name="audio"
                type="file"
                accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
                onChange={handleAudioChange}
                className="mt-2 block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              {audioPreview ? (
                <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium text-zinc-900">
                    <Music2 size={14} className="text-teal-700" />
                    {audioPreview.name}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatFileSize(audioPreview.size)} · {formatDuration(audioPreview.durationSeconds)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
                  A duracao do audio aparece assim que o arquivo for lido no navegador.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        <SubmitButton
          name="intent"
          value={primaryIntent}
          pendingLabel={primaryPendingLabel}
          icon="wand"
        >
          {primaryLabel}
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
          value={mode === "manus" ? "generate" : "manus"}
          pendingLabel={mode === "manus" ? "Salvando e gerando..." : "Gerando com IA..."}
          icon="wand"
          variant="secondary"
        >
          {mode === "manus" ? "Salvar e completar com uploads" : "Tentar fluxo Manus"}
        </SubmitButton>
      </div>
    </form>
  );
}
