import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/session";

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
