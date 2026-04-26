import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { storeEncryptedToken } from "@/integrations/social/token-service";
import {
  exchangeYouTubeCodeForTokens,
  fetchGoogleUserProfile,
} from "@/integrations/social/youtube/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "youtube_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?socialError=${encodeURIComponent(error)}`, request.url));
  }

  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!user || !stateCookie) {
    return NextResponse.redirect(new URL("/settings?socialError=oauth_state", request.url));
  }

  let storedState: { state?: string; userId?: string } | null = null;

  try {
    storedState = JSON.parse(stateCookie) as { state?: string; userId?: string };
  } catch {
    storedState = null;
  }

  if (!code || !state || storedState?.state !== state || storedState.userId !== user.id) {
    return NextResponse.redirect(new URL("/settings?socialError=oauth_state", request.url));
  }

  try {
    const origin = url.origin;
    const tokens = await exchangeYouTubeCodeForTokens({ code, origin });
    const profile = await fetchGoogleUserProfile(tokens.accessToken);

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_accountName: {
          userId: user.id,
          platform: "YOUTUBE",
          accountName: profile.email || profile.name || "YouTube",
        },
      },
      update: {
        externalId: profile.sub,
        accountName: profile.email || profile.name || "YouTube",
        providerAccountType: "google_oauth",
        accessTokenCiphertext: storeEncryptedToken(tokens.accessToken),
        refreshTokenCiphertext: tokens.refreshToken
          ? storeEncryptedToken(tokens.refreshToken)
          : undefined,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        providerMetadata: {
          email: profile.email ?? null,
          name: profile.name ?? null,
          picture: profile.picture ?? null,
        },
        status: "active",
        reauthRequired: false,
        tokenErrorMessage: null,
        lastValidatedAt: new Date(),
        isActive: true,
      },
      create: {
        userId: user.id,
        platform: "YOUTUBE",
        accountName: profile.email || profile.name || "YouTube",
        externalId: profile.sub,
        providerAccountType: "google_oauth",
        accessTokenCiphertext: storeEncryptedToken(tokens.accessToken),
        refreshTokenCiphertext: tokens.refreshToken
          ? storeEncryptedToken(tokens.refreshToken)
          : null,
        tokenExpiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
        providerMetadata: {
          email: profile.email ?? null,
          name: profile.name ?? null,
          picture: profile.picture ?? null,
        },
        status: "active",
        reauthRequired: false,
        tokenErrorMessage: null,
        lastValidatedAt: new Date(),
        isActive: true,
      },
    });

    return NextResponse.redirect(new URL("/settings?youtubeConnected=1", request.url));
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "oauth_callback_failed";
    return NextResponse.redirect(
      new URL(`/settings?socialError=${encodeURIComponent(message)}`, request.url),
    );
  }
}
