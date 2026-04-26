import { afterEach, describe, expect, it } from "vitest";
import { createFileAccessToken, verifyFileAccessToken } from "@/lib/file-access-token";

describe("file access token", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("signs and verifies a relative storage path", () => {
    process.env.SESSION_SECRET = "12345678901234567890123456789012";

    const token = createFileAccessToken("uploads/project-1/video.mp4");

    expect(verifyFileAccessToken(token, "uploads/project-1/video.mp4")).toBe(true);
  });

  it("rejects tokens for a different path", () => {
    process.env.SESSION_SECRET = "12345678901234567890123456789012";

    const token = createFileAccessToken("uploads/project-1/video.mp4");

    expect(verifyFileAccessToken(token, "uploads/project-2/video.mp4")).toBe(false);
  });

  it("rejects expired tokens", async () => {
    process.env.SESSION_SECRET = "12345678901234567890123456789012";

    const token = createFileAccessToken("uploads/project-1/video.mp4", -1);

    expect(verifyFileAccessToken(token, "uploads/project-1/video.mp4")).toBe(false);
  });
});
