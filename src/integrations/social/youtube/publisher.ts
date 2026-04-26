import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSocialAccountTokens, saveSocialAccountTokens } from "@/integrations/social/token-service";
import { refreshYouTubeAccessToken } from "@/integrations/social/youtube/oauth";

type PublishYouTubeVideoInput = {
  socialAccountId: string;
  title: string;
  description: string;
  videoPath: string;
  visibility?: string | null;
};

function normalizeVisibility(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "private" || normalized === "public" || normalized === "unlisted") {
    return normalized;
  }

  return process.env.YOUTUBE_DEFAULT_PRIVACY_STATUS?.trim().toLowerCase() || "private";
}

function extractTags(description: string) {
  return Array.from(
    new Set(
      description
        .split(/\s+/)
        .filter((token) => token.startsWith("#"))
        .map((token) => token.replace(/^#+/, "").replace(/[^\p{L}\p{N}_-]/gu, ""))
        .filter(Boolean),
    ),
  ).slice(0, 15);
}

async function getValidYouTubeAccessToken(socialAccountId: string) {
  const tokens = await getSocialAccountTokens(socialAccountId);
  const shouldRefresh =
    !tokens.expiresAt || tokens.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

  if (!shouldRefresh) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        reauthRequired: true,
        status: "reauth_required",
        tokenErrorMessage: "Refresh token ausente. Reconecte a conta do YouTube.",
      },
    });
    throw new Error("Refresh token ausente. Reconecte a conta do YouTube.");
  }

  const refreshed = await refreshYouTubeAccessToken(tokens.refreshToken);
  await saveSocialAccountTokens(socialAccountId, {
    accessToken: refreshed.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: refreshed.expiresAt,
    scopes: refreshed.scopes,
  });

  return refreshed.accessToken;
}

export async function publishVideoToYouTube(input: PublishYouTubeVideoInput) {
  const accessToken = await getValidYouTubeAccessToken(input.socialAccountId);
  const bytes = await fs.readFile(input.videoPath);
  const visibility = normalizeVisibility(input.visibility);
  const metadata = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 5000),
      categoryId: "22",
      tags: extractTags(input.description),
    },
    status: {
      privacyStatus: visibility,
      selfDeclaredMadeForKids: false,
    },
  };

  const startResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(bytes.byteLength),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!startResponse.ok) {
    const detail = await startResponse.text();
    throw new Error(`Falha ao iniciar upload no YouTube. ${detail}`.trim());
  }

  const uploadUrl = startResponse.headers.get("location");

  if (!uploadUrl) {
    throw new Error("YouTube nao retornou a URL de upload resumable.");
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });

  const payload = (await uploadResponse.json().catch(() => null)) as
    | {
        id?: string;
        status?: { uploadStatus?: string; privacyStatus?: string };
      }
    | null;

  if (!uploadResponse.ok || !payload?.id) {
    const detail = payload ? JSON.stringify(payload) : await uploadResponse.text().catch(() => "");
    throw new Error(`Falha ao concluir upload no YouTube. ${detail}`.trim());
  }

  return {
    providerPostId: payload.id,
    providerStatus: payload.status?.uploadStatus || "uploaded",
    visibility,
    videoUrl: `https://www.youtube.com/watch?v=${payload.id}`,
  };
}
