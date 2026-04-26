import { prisma } from "@/lib/prisma";
import { getExternallyReachableFileUrl } from "@/integrations/social/external-url";
import { getSocialAccountTokens, saveSocialAccountTokens } from "@/integrations/social/token-service";
import { refreshInstagramAccessToken } from "@/integrations/social/instagram/oauth";

type PublishInstagramVideoInput = {
  socialAccountId: string;
  caption: string;
  videoPath: string;
};

async function getValidInstagramAccessToken(socialAccountId: string) {
  const tokens = await getSocialAccountTokens(socialAccountId);
  const shouldRefresh =
    !tokens.expiresAt || tokens.expiresAt.getTime() <= Date.now() + 24 * 60 * 60 * 1000;

  if (!shouldRefresh) {
    return tokens.accessToken;
  }

  const refreshed = await refreshInstagramAccessToken(tokens.accessToken);
  await saveSocialAccountTokens(socialAccountId, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    scopes: refreshed.scopes,
  });

  return refreshed.accessToken;
}

async function createInstagramReelContainer(input: {
  instagramUserId: string;
  accessToken: string;
  caption: string;
  videoUrl: string;
}) {
  const response = await fetch(
    `https://graph.instagram.com/v24.0/${input.instagramUserId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: input.videoUrl,
        caption: input.caption,
        share_to_feed: true,
        access_token: input.accessToken,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { id?: string }
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || !("id" in payload) || !payload.id) {
    const detail =
      payload && "error" in payload && payload.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao criar container do Instagram.${detail}`.trim());
  }

  return payload.id;
}

async function waitForInstagramContainer(input: {
  containerId: string;
  accessToken: string;
}) {
  const timeoutAt = Date.now() + 10 * 60 * 1000;

  while (Date.now() < timeoutAt) {
    const params = new URLSearchParams({
      fields: "status_code,status",
      access_token: input.accessToken,
    });
    const response = await fetch(
      `https://graph.instagram.com/v24.0/${input.containerId}?${params.toString()}`,
    );
    const payload = (await response.json().catch(() => null)) as
      | { status_code?: string; status?: string }
      | { error?: { message?: string } }
      | null;

    if (!response.ok || !payload) {
      const detail =
        payload && "error" in payload && payload.error?.message ? ` ${payload.error.message}` : "";
      throw new Error(`Falha ao consultar status do Instagram.${detail}`.trim());
    }

    const statusCode =
      "status_code" in payload && typeof payload.status_code === "string"
        ? payload.status_code.toUpperCase()
        : undefined;

    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
      return statusCode.toLowerCase();
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new Error(`Instagram nao conseguiu processar o video. Status: ${statusCode}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  throw new Error("Instagram nao concluiu o processamento do video a tempo.");
}

async function publishInstagramContainer(input: {
  instagramUserId: string;
  containerId: string;
  accessToken: string;
}) {
  const response = await fetch(
    `https://graph.instagram.com/v24.0/${input.instagramUserId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        creation_id: input.containerId,
        access_token: input.accessToken,
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | { id?: string }
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || !("id" in payload) || !payload.id) {
    const detail =
      payload && "error" in payload && payload.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao publicar reel no Instagram.${detail}`.trim());
  }

  return payload.id;
}

export async function publishVideoToInstagram(input: PublishInstagramVideoInput) {
  const socialAccount = await prisma.socialAccount.findUnique({
    where: { id: input.socialAccountId },
    select: {
      externalId: true,
    },
  });

  if (!socialAccount?.externalId) {
    throw new Error("Conta do Instagram sem identificador valido. Reconecte a conta.");
  }

  const accessToken = await getValidInstagramAccessToken(input.socialAccountId);
  const videoUrl = getExternallyReachableFileUrl(input.videoPath);
  const containerId = await createInstagramReelContainer({
    instagramUserId: socialAccount.externalId,
    accessToken,
    caption: input.caption.slice(0, 2_200),
    videoUrl,
  });

  const providerStatus = await waitForInstagramContainer({
    containerId,
    accessToken,
  });

  const providerPostId = await publishInstagramContainer({
    instagramUserId: socialAccount.externalId,
    containerId,
    accessToken,
  });

  return {
    providerPostId,
    providerStatus,
    visibility: "reels",
    videoUrl: `https://www.instagram.com/reel/${providerPostId}/`,
  };
}
