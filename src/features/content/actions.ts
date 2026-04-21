"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/upload-service";
import { videoService } from "@/features/video/video-service";

export async function createContentAction(formData: FormData) {
  const { input, files } = parseProjectFormData(formData);
  const content = await createProjectWithUploads(input, files);

  if (formData.get("intent") === "generate") {
    await videoService.generateProjectVideo(content.id);
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  redirect(`/contents/${content.id}`);
}

export async function generateContentVideoAction(contentId: string) {
  await videoService.generateProjectVideo(contentId);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  revalidatePath(`/contents/${contentId}`);
}
