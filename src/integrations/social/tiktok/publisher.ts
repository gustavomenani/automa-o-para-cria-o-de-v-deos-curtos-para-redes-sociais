import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSocialAccountTokens, saveSocialAccountTokens } from "@/integrations/social/token-service";
import { refreshTikTokAccessToken } from "@/integrations/social/tiktok/oauth";

type PublishTikTokVideoInput = {
  socialAccountId: string;
  caption: string;
  videoPath: string;
  visibility?: string | null;
};

type TikTokCreatorInfo = {
  creator_avatar_url?: string;
  creator_nickname?: string;
  creator_username?: string;
  privacy_level_options?: string[];
};

const TIKTOK_MAX_CHUNK_SIZE = 10_000_000;

async function getValidTikTokAccessToken(socialAccountId: string) {
  const tokens = await getSocialAccountTokens(socialAccountId);
  const shouldRefresh =
    !tokens.expiresAt || tokens.expiresAt.getTime() <= Date.now() + 5 * 60 * 1000;

  if (!shouldRefresh) {
    return tokens;
  }

  if (!tokens.refreshToken) {
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        reauthRequired: true,
        status: "reauth_required",
        tokenErrorMessage: "Refresh token ausente. Reconecte a conta do TikTok.",
      },
    });
    throw new Error("Refresh token ausente. Reconecte a conta do TikTok.");
  }

  const refreshed = await refreshTikTokAccessToken(tokens.refreshToken);
  await saveSocialAccountTokens(socialAccountId, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
    scopes: refreshed.scopes,
  });

  return {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  };
}

export async function queryTikTokCreatorInfo(accessToken: string) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: TikTokCreatorInfo;
        error?: {
          code?: string;
          message?: string;
        };
      }
    | null;

  if (!response.ok || !payload?.data) {
    const detail = payload?.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao carregar dados da conta TikTok.${detail}`.trim());
  }

  return payload.data;
}

function normalizeTikTokVisibility(value: string | null | undefined, creatorInfo: TikTokCreatorInfo) {
  const allowed = creatorInfo.privacy_level_options?.filter(Boolean) ?? [];

  if (!allowed.length) {
    return "SELF_ONLY";
  }

  const normalized = value?.trim().toUpperCase();
  if (normalized && allowed.includes(normalized)) {
    return normalized;
  }

  return allowed.includes("PUBLIC_TO_EVERYONE")
    ? "PUBLIC_TO_EVERYONE"
    : allowed[0]!;
}

async function initializeTikTokUpload(input: {
  accessToken: string;
  bytesLength: number;
  chunkCount: number;
  visibility: string;
  title: string;
}) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: input.title,
        privacy_level: input.visibility,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 0,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: input.bytesLength,
        chunk_size: Math.min(TIKTOK_MAX_CHUNK_SIZE, input.bytesLength),
        total_chunk_count: input.chunkCount,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          publish_id?: string;
          upload_url?: string;
        };
        error?: {
          code?: string;
          message?: string;
        };
      }
    | null;

  if (!response.ok || !payload?.data?.publish_id || !payload.data.upload_url) {
    const detail = payload?.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao iniciar upload no TikTok.${detail}`.trim());
  }

  return {
    publish_id: payload.data.publish_id,
    upload_url: payload.data.upload_url,
  };
}

async function uploadTikTokChunks(uploadUrl: string, bytes: Buffer) {
  const chunkSize = Math.min(TIKTOK_MAX_CHUNK_SIZE, bytes.byteLength);
  let start = 0;
  let chunkIndex = 0;

  while (start < bytes.byteLength) {
    const end = Math.min(start + chunkSize, bytes.byteLength);
    const chunk = bytes.subarray(start, end);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${end - 1}/${bytes.byteLength}`,
      },
      body: new Uint8Array(chunk),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Falha ao enviar bloco ${chunkIndex + 1} para o TikTok. ${detail}`.trim(),
      );
    }

    start = end;
    chunkIndex += 1;
  }
}

async function fetchTikTokPublishStatus(input: {
  accessToken: string;
  publishId: string;
}) {
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      publish_id: input.publishId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        data?: {
          status?: string;
          publicaly_available_post_id?: string;
          publicly_available_post_id?: string;
        };
      }
    | null;

  if (!response.ok) {
    return null;
  }

  return payload?.data ?? null;
}

export async function publishVideoToTikTok(input: PublishTikTokVideoInput) {
  const tokens = await getValidTikTokAccessToken(input.socialAccountId);
  const creatorInfo = await queryTikTokCreatorInfo(tokens.accessToken);
  const visibility = normalizeTikTokVisibility(input.visibility, creatorInfo);
  const bytes = await fs.readFile(input.videoPath);
  const chunkCount = Math.max(1, Math.ceil(bytes.byteLength / TIKTOK_MAX_CHUNK_SIZE));
  const upload = await initializeTikTokUpload({
    accessToken: tokens.accessToken,
    bytesLength: bytes.byteLength,
    chunkCount,
    visibility,
    title: input.caption.slice(0, 150),
  });

  await uploadTikTokChunks(upload.upload_url, bytes);
  const status = await fetchTikTokPublishStatus({
    accessToken: tokens.accessToken,
    publishId: upload.publish_id,
  });

  return {
    providerPostId: String(
      status?.publicly_available_post_id || status?.publicaly_available_post_id || upload.publish_id,
    ),
    providerStatus: status?.status || "uploaded",
    visibility,
    videoUrl:
      status?.publicly_available_post_id || status?.publicaly_available_post_id
        ? `https://www.tiktok.com/@${creatorInfo.creator_username || "creator"}/video/${
            status.publicly_available_post_id || status.publicaly_available_post_id
          }`
        : undefined,
  };
}
