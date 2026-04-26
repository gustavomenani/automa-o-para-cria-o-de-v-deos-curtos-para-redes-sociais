import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/session";
import { socialPlatformLabels } from "@/integrations/social/social-platforms";

type DefaultManusConfig = {
  durationSeconds?: number;
  style?: string;
};

function getConfigValue(config: unknown): DefaultManusConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  return config as DefaultManusConfig;
}

export async function getManusSettings() {
  const user = await requireUser();
  const settings = await prisma.manusSettings.findUnique({
    where: { userId: user.id },
  });

  const reels = getConfigValue(settings?.defaultReelsConfig);
  const stories = getConfigValue(settings?.defaultStoriesConfig);

  return {
    hasApiKey: Boolean(settings?.apiKey),
    modelPreference: settings?.modelPreference ?? "",
    promptPreference: settings?.promptPreference ?? "",
    reelsDuration: reels.durationSeconds ?? 30,
    reelsStyle: reels.style ?? "",
    storiesDuration: stories.durationSeconds ?? 15,
    storiesStyle: stories.style ?? "",
    updatedAt: settings?.updatedAt ?? null,
  };
}

export async function getConnectedSocialAccounts() {
  const user = await requireUser();
  const accounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
  });

  return accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    platformLabel: socialPlatformLabels[account.platform],
    accountName: account.accountName,
    externalId: account.externalId,
    status: account.reauthRequired
      ? "Precisa reconectar"
      : account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < 1000 * 60 * 60 * 24
        ? "Expirando"
        : account.isActive
          ? "Conectada"
          : "Inativa",
    isActive: account.isActive,
    reauthRequired: account.reauthRequired,
    tokenExpiresAt: account.tokenExpiresAt,
    tokenErrorMessage: account.tokenErrorMessage,
    lastValidatedAt: account.lastValidatedAt,
    scopes:
      Array.isArray(account.scopes) || typeof account.scopes === "string"
        ? account.scopes
        : [],
    providerMetadata: account.providerMetadata,
    createdAt: account.createdAt,
  }));
}

function commandExists(command: string) {
  const locator = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(locator, [command], { encoding: "utf8" });
  return result.status === 0;
}

function isPublicMediaUrlValid() {
  const value = process.env.PUBLIC_MEDIA_BASE_URL;

  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol.startsWith("http") && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

export async function getEnvironmentHealth() {
  const ffmpegPath = process.env.FFMPEG_PATH;
  const ffmpegAvailable = ffmpegPath ? existsSync(ffmpegPath) : commandExists("ffmpeg");
  const whisperRunner = process.env.WHISPER_COMMAND ?? "";

  return [
    {
      label: "MANUS_API_KEY",
      ok: Boolean(process.env.MANUS_API_KEY),
      detail: process.env.MANUS_API_KEY ? "Chave presente no ambiente." : "Chave ausente.",
    },
    {
      label: "FFmpeg",
      ok: ffmpegAvailable,
      detail: ffmpegAvailable ? "Binario localizado." : "FFmpeg nao encontrado no ambiente.",
    },
    {
      label: "Whisper",
      ok: whisperRunner.length > 0 || commandExists("python"),
      detail:
        whisperRunner.length > 0
          ? "Comando customizado configurado."
          : commandExists("python")
            ? "Python disponivel para transcricao."
            : "Python/Whisper nao detectado.",
    },
    {
      label: "Storage",
      ok: Boolean(process.env.LOCAL_STORAGE_ROOT),
      detail: process.env.LOCAL_STORAGE_ROOT
        ? `Raiz configurada: ${process.env.LOCAL_STORAGE_ROOT}`
        : "Usando raiz padrao do projeto.",
    },
    {
      label: "PUBLIC_MEDIA_BASE_URL",
      ok: isPublicMediaUrlValid(),
      detail: isPublicMediaUrlValid()
        ? "URL publica pronta para redes sociais."
        : "Use uma URL publica real; localhost nao serve para Instagram/TikTok.",
    },
    {
      label: "OAuth social",
      ok:
        Boolean(process.env.GOOGLE_CLIENT_ID) &&
        Boolean(process.env.INSTAGRAM_APP_ID) &&
        Boolean(process.env.TIKTOK_CLIENT_KEY),
      detail:
        "Verifica presenca das credenciais base de YouTube, Instagram e TikTok para conectar contas.",
    },
  ];
}
