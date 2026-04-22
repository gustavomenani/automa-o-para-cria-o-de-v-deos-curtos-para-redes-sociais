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

export async function saveManusSettingsAction(formData: FormData) {
  const user = await requireUser();
  const parsed = manusSettingsSchema.parse({
    apiKey: formData.get("apiKey") || undefined,
    modelPreference: formData.get("modelPreference") || undefined,
    promptPreference: formData.get("promptPreference") || undefined,
    reelsDuration: formData.get("reelsDuration"),
    reelsStyle: formData.get("reelsStyle") || undefined,
    storiesDuration: formData.get("storiesDuration"),
    storiesStyle: formData.get("storiesStyle") || undefined,
  });

  const existing = await prisma.manusSettings.findUnique({
    where: { userId: user.id },
  });

  const data = {
    apiKey: parsed.apiKey || existing?.apiKey || null,
    modelPreference: parsed.modelPreference || null,
    promptPreference: parsed.promptPreference || null,
    defaultReelsConfig: {
      durationSeconds: parsed.reelsDuration,
      style: parsed.reelsStyle || "",
      format: "reels",
      aspectRatio: "9:16",
    },
    defaultStoriesConfig: {
      durationSeconds: parsed.storiesDuration,
      style: parsed.storiesStyle || "",
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
