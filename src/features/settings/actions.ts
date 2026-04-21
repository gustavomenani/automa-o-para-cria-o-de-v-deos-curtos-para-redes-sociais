"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
  const parsed = manusSettingsSchema.parse({
    apiKey: formData.get("apiKey") || undefined,
    modelPreference: formData.get("modelPreference") || undefined,
    promptPreference: formData.get("promptPreference") || undefined,
    reelsDuration: formData.get("reelsDuration"),
    reelsStyle: formData.get("reelsStyle") || undefined,
    storiesDuration: formData.get("storiesDuration"),
    storiesStyle: formData.get("storiesStyle") || undefined,
  });

  const existing = await prisma.manusSettings.findFirst({
    orderBy: { updatedAt: "desc" },
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

  if (existing) {
    await prisma.manusSettings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.manusSettings.create({ data });
  }

  revalidatePath("/settings");
}
