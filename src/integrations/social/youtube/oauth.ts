const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "openid",
  "email",
  "profile",
] as const;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} nao configurado.`);
  }

  return value;
}

export function getYouTubeScopes() {
  return [...YOUTUBE_SCOPES];
}

export function getYouTubeOAuthConfig(origin?: string) {
  const clientId = getRequiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getRequiredEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri =
    process.env.GOOGLE_OAUTH_CALLBACK_URL?.trim() ||
    `${origin ?? getRequiredEnv("APP_BASE_URL")}/api/oauth/youtube/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function createYouTubeAuthorizationUrl(input: {
  state: string;
  origin?: string;
}) {
  const { clientId, redirectUri } = getYouTubeOAuthConfig(input.origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: getYouTubeScopes().join(" "),
    state: input.state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeYouTubeCodeForTokens(input: {
  code: string;
  origin?: string;
}) {
  const { clientId, clientSecret, redirectUri } = getYouTubeOAuthConfig(input.origin);
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | TokenResponse
    | { error?: string; error_description?: string }
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    throw new Error(
      `Falha ao trocar o codigo OAuth do Google.${
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
    scopes: payload.scope?.split(" ").filter(Boolean) ?? getYouTubeScopes(),
  };
}

export async function refreshYouTubeAccessToken(refreshToken: string, origin?: string) {
  const { clientId, clientSecret } = getYouTubeOAuthConfig(origin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | TokenResponse
    | { error?: string; error_description?: string }
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    throw new Error(
      `Falha ao renovar token do Google.${
        payload && "error_description" in payload && payload.error_description
          ? ` ${payload.error_description}`
          : ""
      }`,
    );
  }

  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
    scopes: payload.scope?.split(" ").filter(Boolean) ?? getYouTubeScopes(),
  };
}

export async function fetchGoogleUserProfile(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      }
    | null;

  if (!response.ok || !payload?.sub) {
    throw new Error("Falha ao carregar perfil da conta Google conectada.");
  }

  return payload;
}
