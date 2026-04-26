import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { createInstagramAuthorizationUrl } from "@/integrations/social/instagram/oauth";
import { createOAuthState, writeOAuthStateCookie } from "@/integrations/social/oauth-state";

export const runtime = "nodejs";

const STATE_COOKIE = "instagram_oauth_state";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const state = createOAuthState();
  const origin = new URL(request.url).origin;
  await writeOAuthStateCookie(STATE_COOKIE, {
    state,
    userId: user.id,
    createdAt: Date.now(),
  });

  return NextResponse.redirect(createInstagramAuthorizationUrl({ state, origin }));
}
