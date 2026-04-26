const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} nao configurado.`);
  }

  return value;
}

export function getInstagramScopes() {
  return [...INSTAGRAM_SCOPES];
}

export function getInstagramOAuthConfig(origin?: string) {
  const clientId = getRequiredEnv("INSTAGRAM_APP_ID");
  const clientSecret = getRequiredEnv("INSTAGRAM_APP_SECRET");
  const redirectUri =
    process.env.INSTAGRAM_OAUTH_CALLBACK_URL?.trim() ||
    `${origin ?? getRequiredEnv("APP_BASE_URL")}/api/oauth/instagram/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
}

export function createInstagramAuthorizationUrl(input: {
  state: string;
  origin?: string;
}) {
  const { clientId, redirectUri } = getInstagramOAuthConfig(input.origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getInstagramScopes().join(","),
    state: input.state,
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

type InstagramOAuthTokenResponse = {
  access_token: string;
  user_id: string;
  permissions?: string;
};

type InstagramLongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function exchangeInstagramCodeForTokens(input: {
  code: string;
  origin?: string;
}) {
  const { clientId, clientSecret, redirectUri } = getInstagramOAuthConfig(input.origin);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: input.code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as
    | InstagramOAuthTokenResponse
    | { error_message?: string; error_type?: string }
    | null;

  if (!response.ok || !payload || !("access_token" in payload) || !payload.access_token) {
    throw new Error(
      `Falha ao trocar o codigo OAuth do Instagram.${
        payload && "error_message" in payload && payload.error_message
          ? ` ${payload.error_message}`
          : ""
      }`,
    );
  }

  const longLived = await exchangeInstagramAccessTokenForLongLivedToken(payload.access_token);

  return {
    accessToken: longLived.accessToken,
    refreshToken: longLived.accessToken,
    expiresAt: longLived.expiresAt,
    scopes: getInstagramScopes(),
    userId: payload.user_id,
  };
}

async function exchangeInstagramAccessTokenForLongLivedToken(accessToken: string) {
  const { clientSecret } = getInstagramOAuthConfig();
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);
  const payload = (await response.json().catch(() => null)) as
    | InstagramLongLivedTokenResponse
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    const detail =
      payload && "error" in payload && payload.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao obter token longo do Instagram.${detail}`.trim());
  }

  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
  };
}

export async function refreshInstagramAccessToken(accessToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?${params.toString()}`,
  );

  const payload = (await response.json().catch(() => null)) as
    | InstagramLongLivedTokenResponse
    | { error?: { message?: string } }
    | null;

  if (!response.ok || !payload || !("access_token" in payload)) {
    const detail =
      payload && "error" in payload && payload.error?.message ? ` ${payload.error.message}` : "";
    throw new Error(`Falha ao renovar token do Instagram.${detail}`.trim());
  }

  return {
    accessToken: payload.access_token,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
    scopes: getInstagramScopes(),
  };
}

export async function fetchInstagramProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "user_id,username",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const payload = (await response.json().catch(() => null)) as
    | {
        user_id?: string;
        username?: string;
      }
    | { error?: { message?: string } }
    | null;

  if (
    !response.ok ||
    !payload ||
    !("user_id" in payload) ||
    !payload.user_id ||
    !payload.username
  ) {
    throw new Error("Falha ao carregar perfil da conta Instagram conectada.");
  }

  return {
    user_id: payload.user_id,
    username: payload.username,
  };
}
