import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { readOAuthStateCookie } from "@/integrations/social/oauth-state";
import { storeEncryptedToken } from "@/integrations/social/token-service";
import {
  exchangeTikTokCodeForTokens,
  getTikTokScopes,
} from "@/integrations/social/tiktok/oauth";
import { queryTikTokCreatorInfo } from "@/integrations/social/tiktok/publisher";

export const runtime = "nodejs";

const STATE_COOKIE = "tiktok_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?socialError=${encodeURIComponent(error)}`, request.url),
    );
  }

  const user = await getCurrentUser();
  const storedState = await readOAuthStateCookie(STATE_COOKIE);

  if (!user || !storedState) {
    return NextResponse.redirect(new URL("/settings?socialError=oauth_state", request.url));
  }

  if (
    !code ||
    !state ||
    !storedState.codeVerifier ||
    storedState.state !== state ||
    storedState.userId !== user.id
  ) {
    return NextResponse.redirect(new URL("/settings?socialError=oauth_state", request.url));
  }

  try {
    const origin = url.origin;
    const tokens = await exchangeTikTokCodeForTokens({
      code,
      codeVerifier: storedState.codeVerifier,
      origin,
    });
    const creatorInfo = await queryTikTokCreatorInfo(tokens.accessToken);
    const accountName =
      creatorInfo.creator_username || creatorInfo.creator_nickname || "TikTok";
    const externalId = tokens.openId || creatorInfo.creator_username || accountName;
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        userId: user.id,
        platform: "TIKTOK",
        OR: [
          { externalId },
          { accountName },
        ],
      },
      select: { id: true },
    });

    const data = {
      externalId,
      accountName,
      providerAccountType: "tiktok_oauth",
      accessTokenCiphertext: storeEncryptedToken(tokens.accessToken),
      refreshTokenCiphertext: storeEncryptedToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes.length ? tokens.scopes : getTikTokScopes(),
      providerMetadata: {
        username: creatorInfo.creator_username ?? null,
        nickname: creatorInfo.creator_nickname ?? null,
        avatarUrl: creatorInfo.creator_avatar_url ?? null,
        privacyLevelOptions: creatorInfo.privacy_level_options ?? [],
      },
      status: "active",
      reauthRequired: false,
      tokenErrorMessage: null,
      lastValidatedAt: new Date(),
      isActive: true,
    } as const;

    if (existingAccount) {
      await prisma.socialAccount.update({
        where: { id: existingAccount.id },
        data,
      });
    } else {
      await prisma.socialAccount.create({
        data: {
          userId: user.id,
          platform: "TIKTOK",
          ...data,
        },
      });
    }

    return NextResponse.redirect(new URL("/settings?tiktokConnected=1", request.url));
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings?socialError=${encodeURIComponent(message)}`, request.url),
    );
  }
}
