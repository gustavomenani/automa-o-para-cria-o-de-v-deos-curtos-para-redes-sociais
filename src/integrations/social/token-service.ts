import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

type StoredTokenBundle = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
};

export function storeEncryptedToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return encryptSecret(value);
}

export function readEncryptedToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return decryptSecret(value);
}

export async function getSocialAccountTokens(socialAccountId: string): Promise<StoredTokenBundle> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: {
      accessTokenCiphertext: true,
      refreshTokenCiphertext: true,
      tokenExpiresAt: true,
    },
  });

  if (!account?.accessTokenCiphertext) {
    throw new Error("Conta social sem access token valido.");
  }

  return {
    accessToken: readEncryptedToken(account.accessTokenCiphertext)!,
    refreshToken: readEncryptedToken(account.refreshTokenCiphertext),
    expiresAt: account.tokenExpiresAt,
  };
}

export async function saveSocialAccountTokens(
  socialAccountId: string,
  input: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    scopes?: string[];
  },
) {
  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      accessTokenCiphertext: storeEncryptedToken(input.accessToken),
      refreshTokenCiphertext:
        input.refreshToken === undefined
          ? undefined
          : storeEncryptedToken(input.refreshToken),
      tokenExpiresAt: input.expiresAt ?? null,
      scopes: input.scopes ?? undefined,
      reauthRequired: false,
      tokenErrorMessage: null,
      lastValidatedAt: new Date(),
      isActive: true,
      status: "active",
    },
  });
}
