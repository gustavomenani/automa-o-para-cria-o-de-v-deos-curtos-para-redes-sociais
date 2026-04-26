import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import {
  exchangeInstagramCodeForTokens,
  fetchInstagramProfile,
} from "@/integrations/social/instagram/oauth";
import { readOAuthStateCookie } from "@/integrations/social/oauth-state";
import { storeEncryptedToken } from "@/integrations/social/token-service";

export const runtime = "nodejs";

const STATE_COOKIE = "instagram_oauth_state";

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

  if (!code || !state || storedState.state !== state || storedState.userId !== user.id) {
    return NextResponse.redirect(new URL("/settings?socialError=oauth_state", request.url));
  }

  try {
    const origin = url.origin;
    const tokens = await exchangeInstagramCodeForTokens({ code, origin });
    const profile = await fetchInstagramProfile(tokens.accessToken);
    const existingAccount = await prisma.socialAccount.findFirst({
      where: {
        userId: user.id,
        platform: "INSTAGRAM",
        OR: [
          { externalId: profile.user_id },
          { accountName: profile.username },
        ],
      },
      select: { id: true },
    });

    const data = {
      externalId: profile.user_id,
      accountName: profile.username,
      providerAccountType: "instagram_login",
      accessTokenCiphertext: storeEncryptedToken(tokens.accessToken),
      refreshTokenCiphertext: storeEncryptedToken(tokens.refreshToken),
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
      providerMetadata: {
        username: profile.username,
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
          platform: "INSTAGRAM",
          ...data,
        },
      });
    }

    return NextResponse.redirect(new URL("/settings?instagramConnected=1", request.url));
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings?socialError=${encodeURIComponent(message)}`, request.url),
    );
  }
}
