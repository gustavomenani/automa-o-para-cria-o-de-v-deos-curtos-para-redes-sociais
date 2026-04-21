"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { videoService } from "@/features/video/services/video-service";

export async function createContentAction(formData: FormData) {
  const { input, files } = parseProjectFormData(formData);
  const content = await createProjectWithUploads(input, files);
  let successParam = "created=1";

  if (formData.get("intent") === "generate") {
    await videoService.generateProjectVideo(content.id);
    successParam = "generated=1";
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  redirect(`/contents/${content.id}?${successParam}`);
}

export async function generateContentVideoAction(contentId: string) {
  await videoService.generateProjectVideo(contentId);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/contents");
  revalidatePath(`/contents/${contentId}`);
  redirect(`/contents/${contentId}?generated=1`);
}
