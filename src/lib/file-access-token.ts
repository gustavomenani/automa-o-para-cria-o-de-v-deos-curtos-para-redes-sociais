import { createHmac, timingSafeEqual } from "node:crypto";

type FileAccessPayload = {
  path: string;
  exp: number;
};

const DEFAULT_MAX_AGE_SECONDS = 15 * 60;

function getFileAccessSecret() {
  const secret =
    process.env.MEDIA_URL_SIGNING_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    process.env.SOCIAL_TOKEN_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET, SOCIAL_TOKEN_SECRET ou MEDIA_URL_SIGNING_SECRET precisa ter pelo menos 32 caracteres para assinar URLs publicas.",
    );
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getFileAccessSecret()).update(value).digest("base64url");
}

function encodePayload(payload: FileAccessPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as FileAccessPayload;
}

export function createFileAccessToken(relativePath: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) {
  const body = encodePayload({
    path: relativePath,
    exp: Date.now() + maxAgeSeconds * 1000,
  });

  return `${body}.${sign(body)}`;
}

export function verifyFileAccessToken(token: string, relativePath: string) {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return false;
  }

  const expectedSignature = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = decodePayload(body);

    return payload.path === relativePath && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
