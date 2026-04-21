"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProjectWithUploads,
  parseProjectFormData,
} from "@/features/content/services/upload-service";
import { videoService } from "@/features/video/services/video-service";
import { prisma } from "@/lib/prisma";
import { deleteProjectStorage } from "@/lib/storage/local-storage";

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

type DeleteContentRedirectTarget = "contents" | "schedule";

const deleteRedirects: Record<DeleteContentRedirectTarget, string> = {
  contents: "/contents?deleted=1",
  schedule: "/schedule?deleted=1",
};

export async function deleteContentProjectAction(
  contentId: string,
  redirectTarget: DeleteContentRedirectTarget = "contents",
) {
  const project = await prisma.contentProject.findUnique({
    where: { id: contentId },
    include: {
      mediaFiles: true,
      generatedVideos: true,
      scheduledPosts: true,
    },
  });

  if (!project) {
    throw new Error("Conteudo nao encontrado.");
  }

  await prisma.contentProject.delete({
    where: { id: project.id },
  });

  await deleteProjectStorage(
    project.id,
    project.generatedVideos.map((video) => video.path),
  );

  revalidatePath("/");
  revalidatePath("/contents");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  redirect(deleteRedirects[redirectTarget]);
}
