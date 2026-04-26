import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInstagramAuthorizationUrl,
  getInstagramOAuthConfig,
} from "@/integrations/social/instagram/oauth";

describe("instagram oauth config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("uses the request origin when no explicit callback url is configured", () => {
    process.env.INSTAGRAM_APP_ID = "instagram-app-id";
    process.env.INSTAGRAM_APP_SECRET = "instagram-app-secret";
    delete process.env.INSTAGRAM_OAUTH_CALLBACK_URL;
    delete process.env.APP_BASE_URL;

    const config = getInstagramOAuthConfig("http://localhost:3000");

    expect(config.redirectUri).toBe("http://localhost:3000/api/oauth/instagram/callback");
    expect(config.clientId).toBe("instagram-app-id");
    expect(config.clientSecret).toBe("instagram-app-secret");
  });

  it("can build the long-lived token exchange path without APP_BASE_URL", async () => {
    process.env.INSTAGRAM_APP_ID = "instagram-app-id";
    process.env.INSTAGRAM_APP_SECRET = "instagram-app-secret";
    delete process.env.INSTAGRAM_OAUTH_CALLBACK_URL;
    delete process.env.APP_BASE_URL;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "short-lived-token",
        user_id: "ig-user-1",
      }),
    });
    const longLivedFetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "long-lived-token",
        token_type: "bearer",
        expires_in: 60 * 60 * 24,
      }),
    });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/oauth/access_token")) {
        return fetchMock(input);
      }

      return longLivedFetchMock(input);
    }));

    const { exchangeInstagramCodeForTokens } = await import("@/integrations/social/instagram/oauth");
    const tokens = await exchangeInstagramCodeForTokens({
      code: "oauth-code",
      origin: "http://localhost:3000",
    });

    expect(tokens.accessToken).toBe("long-lived-token");
    expect(longLivedFetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates the authorization url with the provided origin", () => {
    process.env.INSTAGRAM_APP_ID = "instagram-app-id";
    process.env.INSTAGRAM_APP_SECRET = "instagram-app-secret";
    delete process.env.INSTAGRAM_OAUTH_CALLBACK_URL;
    delete process.env.APP_BASE_URL;

    const url = createInstagramAuthorizationUrl({
      state: "state-1",
      origin: "http://localhost:3000",
    });

    expect(url).toContain("client_id=instagram-app-id");
    expect(url).toContain(
      encodeURIComponent("http://localhost:3000/api/oauth/instagram/callback"),
    );
    expect(url).toContain("state=state-1");
  });
});
