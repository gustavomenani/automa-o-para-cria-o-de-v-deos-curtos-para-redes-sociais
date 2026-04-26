import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

type OAuthStatePayload = {
  state: string;
  userId: string;
  createdAt: number;
  codeVerifier?: string;
};

export function createOAuthState() {
  return randomUUID();
}

export async function writeOAuthStateCookie(
  cookieName: string,
  payload: OAuthStatePayload,
  maxAgeSeconds = 60 * 10,
) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function readOAuthStateCookie(cookieName: string) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(cookieName)?.value;
  cookieStore.delete(cookieName);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OAuthStatePayload;
  } catch {
    return null;
  }
}
