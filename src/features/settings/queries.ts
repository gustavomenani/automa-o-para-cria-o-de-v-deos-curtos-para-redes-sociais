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
    status: account.status,
    isActive: account.isActive,
    reauthRequired: account.reauthRequired,
    tokenExpiresAt: account.tokenExpiresAt,
    tokenErrorMessage: account.tokenErrorMessage,
    providerMetadata: account.providerMetadata,
    createdAt: account.createdAt,
  }));
}
