import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/features/auth/session";
import { createYouTubeAuthorizationUrl } from "@/integrations/social/youtube/oauth";

export const runtime = "nodejs";

const STATE_COOKIE = "youtube_oauth_state";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const state = randomUUID();
  const origin = new URL(request.url).origin;
  const cookieStore = await cookies();
  cookieStore.set(
    STATE_COOKIE,
    JSON.stringify({
      state,
      userId: user.id,
      createdAt: Date.now(),
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    },
  );

  return NextResponse.redirect(createYouTubeAuthorizationUrl({ state, origin }));
}
