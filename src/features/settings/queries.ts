import { prisma } from "@/lib/prisma";

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
  const settings = await prisma.manusSettings.findFirst({
    orderBy: { updatedAt: "desc" },
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
