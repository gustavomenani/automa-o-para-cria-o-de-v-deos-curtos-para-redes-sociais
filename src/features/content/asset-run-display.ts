import type { AssetGenerationStatus, AssetProvider, Prisma } from "@prisma/client";

type MissingAssets = {
  images: boolean;
  audio: boolean;
};

const statusLabels: Record<AssetGenerationStatus, string> = {
  QUEUED: "na fila",
  RUNNING: "running",
  COMPLETED: "completed",
  PARTIAL: "partial",
  FAILED: "failed",
  MANUAL_ACTION_REQUIRED: "acao manual requerida",
};

export function formatProviderName(provider: AssetProvider) {
  return provider === "MANUS" ? "Manus" : "Gemini";
}

export function formatAssetRunStatus(status: AssetGenerationStatus) {
  return statusLabels[status] ?? status.toLowerCase();
}

export function getMissingAssets(value: Prisma.JsonValue | null | undefined): MissingAssets {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { images: false, audio: false };
  }

  return {
    images: Boolean(value.images),
    audio: Boolean(value.audio),
  };
}

export function maskProviderTaskId(value: string | null | undefined) {
  if (!value) {
    return "nao informado";
  }

  if (value.length <= 10) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function getDisplaySafeMessage(message: string, fallback: string) {
  const trimmed = message.trim();

  if (!trimmed) {
    return fallback;
  }

  if (
    trimmed.includes("GEMINI_API_KEY nao configurada. Adicione a chave no arquivo .env.") ||
    trimmed.includes("GEMINI_API_KEY não configurada. Adicione a chave no arquivo .env.")
  ) {
    return trimmed;
  }

  if (
    trimmed.length > 260 ||
    /^[\[{]/.test(trimmed) ||
    /\b(ffmpeg|ffprobe|stderr|stdout|spawn|traceback|stack|node_modules|libx264|raw provider payload)\b/i.test(
      trimmed,
    ) ||
    /\bat\s+\S+\s+\(/.test(trimmed) ||
    /([A-Z]:\\|\/Users\/|\/home\/|storage[\\/]|\.env)/i.test(trimmed) ||
    /(AIza[0-9A-Za-z_-]{20,}|MANUS_API_KEY|GEMINI_API_KEY=|sk-[0-9A-Za-z_-]{20,})/.test(
      trimmed,
    )
  ) {
    return fallback;
  }

  return trimmed;
}

export function getRunSummaryMessage(
  summary: Prisma.JsonValue | null | undefined,
  fallback: string,
) {
  if (!summary) {
    return null;
  }

  if (typeof summary === "string") {
    return getDisplaySafeMessage(summary, fallback);
  }

  if (typeof summary === "object" && !Array.isArray(summary)) {
    const warnings = summary.warnings;

    if (Array.isArray(warnings) && warnings.length > 0) {
      return getDisplaySafeMessage(String(warnings[0]), fallback);
    }

    const message = summary.message ?? summary.status ?? summary.error;

    if (typeof message === "string") {
      return getDisplaySafeMessage(message, fallback);
    }
  }

  return null;
}
