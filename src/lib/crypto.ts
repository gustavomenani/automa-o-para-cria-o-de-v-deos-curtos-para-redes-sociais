import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getSecretKey() {
  const secret = process.env.SOCIAL_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new Error("SOCIAL_TOKEN_SECRET nao configurado.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string) {
  const [ivPart, tagPart, ciphertextPart] = payload.split(".");

  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error("Token cifrado invalido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getSecretKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
