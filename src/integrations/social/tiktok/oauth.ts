import { createHash, randomBytes } from "node:crypto";

const TIKTOK_SCOPES = ["video.publish"] as const;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} nao configurado.`);
  }

  return value;
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getTikTokScopes() {
  return [...TIKTOK_SCOPES];
}

export function getTikTokOAuthConfig(origin?: string) {
  const clientKey = getRequiredEnv("TIKTOK_CLIENT_KEY");
  const clientSecret = getRequiredEnv("TIKTOK_CLIENT_SECRET");
  const redirectUri =
    process.env.TIKTOK_OAUTH_CALLBACK_URL?.trim() ||
    `${origin ?? getRequiredEnv("APP_BASE_URL")}/api/oauth/tiktok/callback`;

  return {
    clientKey,
    clientSecret,
    redirectUri,
  };
}

export function createTikTokCodeVerifier() {
  return toBase64Url(randomBytes(48)).slice(0, 96);
}

export function createTikTokAuthorizationUrl(input: {
  state: string;
  codeVerifier: string;
  origin?: string;
}) {
  const { clientKey, redirectUri } = getTikTokOAuthConfig(input.origin);
  const codeChallenge = toBase64Url(
    createHash("sha256").update(input.codeVerifier).digest(),
  );
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getTikTokScopes().join(","),
    state: input.state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

type TikTokTokenSuccessResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
};

type TikTokTokenErrorResponse = {
  error?: string;
  error_description?: string;
};

export async function exchangeTikTokCodeForTokens(input: {
  code: string;
  codeVerifier: string;
  origin?: string;
}) {
  const { clientKey, clientSecret, redirectUri } = getTikTokOAuthConfig(input.origin);
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: input.codeVerifier,
  });

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokTokenSuccessResponse
    | TikTokTokenErrorResponse
    | null;

  if (!response.ok || !payload || !("access_token" in payload) || !payload.access_token) {
    throw new Error(
      `Falha ao trocar o codigo OAuth do TikTok.${
        payload && "error_description" in payload && payload.error_description
          ? ` ${payload.error_description}`
          : ""
      }`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
    scopes: payload.scope?.split(",").map((item) => item.trim()).filter(Boolean) ?? getTikTokScopes(),
    openId: payload.open_id ?? null,
  };
}

export async function refreshTikTokAccessToken(refreshToken: string, origin?: string) {
  const { clientKey, clientSecret } = getTikTokOAuthConfig(origin);
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | TikTokTokenSuccessResponse
    | TikTokTokenErrorResponse
    | null;

  if (!response.ok || !payload || !("access_token" in payload) || !payload.access_token) {
    throw new Error(
      `Falha ao renovar token do TikTok.${
        payload && "error_description" in payload && payload.error_description
          ? ` ${payload.error_description}`
          : ""
      }`,
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
    scopes: payload.scope?.split(",").map((item) => item.trim()).filter(Boolean) ?? getTikTokScopes(),
  };
}
