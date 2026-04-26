import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import {
  createTikTokAuthorizationUrl,
  createTikTokCodeVerifier,
} from "@/integrations/social/tiktok/oauth";
import { createOAuthState, writeOAuthStateCookie } from "@/integrations/social/oauth-state";

export const runtime = "nodejs";

const STATE_COOKIE = "tiktok_oauth_state";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const state = createOAuthState();
  const codeVerifier = createTikTokCodeVerifier();
  const origin = new URL(request.url).origin;

  await writeOAuthStateCookie(STATE_COOKIE, {
    state,
    userId: user.id,
    createdAt: Date.now(),
    codeVerifier,
  });

  return NextResponse.redirect(
    createTikTokAuthorizationUrl({
      state,
      codeVerifier,
      origin,
    }),
  );
}
