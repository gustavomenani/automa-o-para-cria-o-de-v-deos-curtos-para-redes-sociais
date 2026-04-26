"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/session";

const manusSettingsSchema = z.object({
  apiKey: z.string().trim().optional(),
  modelPreference: z.string().trim().optional(),
  promptPreference: z.string().trim().optional(),
  reelsDuration: z.coerce.number().int().min(5).max(180),
  reelsStyle: z.string().trim().optional(),
  storiesDuration: z.coerce.number().int().min(3).max(60),
  storiesStyle: z.string().trim().optional(),
});

function redirectWithSettingsError(message: string): never {
  redirect(`/settings?settingsError=${encodeURIComponent(message)}`);
}

export async function saveManusSettingsAction(formData: FormData) {
  const user = await requireUser();
  const parsed = manusSettingsSchema.safeParse({
    apiKey: formData.get("apiKey") || undefined,
    modelPreference: formData.get("modelPreference") || undefined,
    promptPreference: formData.get("promptPreference") || undefined,
    reelsDuration: formData.get("reelsDuration"),
    reelsStyle: formData.get("reelsStyle") || undefined,
    storiesDuration: formData.get("storiesDuration"),
    storiesStyle: formData.get("storiesStyle") || undefined,
  });

  if (!parsed.success) {
    redirectWithSettingsError(
      parsed.error.issues[0]?.message || "Nao foi possivel validar as configuracoes.",
    );
  }

  const existing = await prisma.manusSettings.findUnique({
    where: { userId: user.id },
  });
  const values = parsed.data;

  const data = {
    apiKey: values.apiKey || existing?.apiKey || null,
    modelPreference: values.modelPreference || null,
    promptPreference: values.promptPreference || null,
    defaultReelsConfig: {
      durationSeconds: values.reelsDuration,
      style: values.reelsStyle || "",
      format: "reels",
      aspectRatio: "9:16",
    },
    defaultStoriesConfig: {
      durationSeconds: values.storiesDuration,
      style: values.storiesStyle || "",
      format: "story",
      aspectRatio: "9:16",
    },
  };

  await prisma.manusSettings.upsert({
    where: { userId: user.id },
    update: data,
    create: { ...data, userId: user.id },
  });

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function disconnectSocialAccountAction(formData: FormData) {
  const user = await requireUser();
  const socialAccountId = String(formData.get("socialAccountId") ?? "").trim();

  if (!socialAccountId) {
    redirect("/settings?socialError=Conta%20social%20invalida.");
  }

  const result = await prisma.socialAccount.updateMany({
    where: {
      id: socialAccountId,
      userId: user.id,
    },
    data: {
      isActive: false,
      reauthRequired: true,
      status: "disconnected",
      tokenErrorMessage: "Conta desconectada pelo usuario.",
      accessTokenCiphertext: null,
      refreshTokenCiphertext: null,
      tokenExpiresAt: null,
    },
  });

  if (result.count === 0) {
    redirect("/settings?socialError=Conta%20social%20invalida.");
  }

  revalidatePath("/settings");
  redirect("/settings?socialDisconnected=1");
}

export async function validateSocialAccountAction(formData: FormData) {
  const user = await requireUser();
  const socialAccountId = String(formData.get("socialAccountId") ?? "").trim();

  if (!socialAccountId) {
    redirect("/settings?socialError=Conta%20social%20invalida.");
  }

  const socialAccount = await prisma.socialAccount.findFirst({
    where: {
      id: socialAccountId,
      userId: user.id,
    },
    select: {
      id: true,
      reauthRequired: true,
      isActive: true,
      accessTokenCiphertext: true,
      tokenExpiresAt: true,
    },
  });

  if (!socialAccount) {
    redirect("/settings?socialError=Conta%20social%20invalida.");
  }

  const errorMessage = !socialAccount.isActive
    ? "Conta inativa."
    : socialAccount.reauthRequired
      ? "Conta exige reconexao."
      : !socialAccount.accessTokenCiphertext
        ? "Token de acesso ausente."
        : socialAccount.tokenExpiresAt && socialAccount.tokenExpiresAt.getTime() <= Date.now()
          ? "Token expirado."
          : null;

  await prisma.socialAccount.update({
    where: { id: socialAccount.id },
    data: {
      lastValidatedAt: new Date(),
      tokenErrorMessage: errorMessage,
      status: errorMessage ? "attention" : "active",
    },
  });

  revalidatePath("/settings");
  redirect(errorMessage ? `/settings?socialError=${encodeURIComponent(errorMessage)}` : "/settings?socialValidated=1");
}
