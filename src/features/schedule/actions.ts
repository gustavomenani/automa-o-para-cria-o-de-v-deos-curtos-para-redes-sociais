"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/features/auth/session";
import { publishDueScheduledPosts } from "@/integrations/social/publish-orchestrator";
import {
  SCHEDULE_PAST_DATE_ERROR,
  assertFutureSchedule,
  parseScheduledAt,
} from "@/features/schedule/validation";
import {
  isPublishPlatformReady,
  socialPlatformLabels,
} from "@/integrations/social/social-platforms";
import { normalizeSafeError } from "@/lib/api-response";

const schedulePostSchema = z.object({
  projectId: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE"]),
  socialAccountId: z.string().trim().optional(),
  visibility: z.string().trim().optional(),
  date: z.string().min(1, "Informe a data."),
  time: z.string().min(1, "Informe o horario."),
  caption: z.string().trim().min(1, "Informe a legenda da postagem."),
});

export async function schedulePostAction(formData: FormData) {
  const user = await requireUser();
  const parsed = schedulePostSchema.safeParse({
    projectId: formData.get("projectId"),
    platform: formData.get("platform"),
    socialAccountId: formData.get("socialAccountId") || undefined,
    visibility: formData.get("visibility") || undefined,
    date: formData.get("date"),
    time: formData.get("time"),
    caption: formData.get("caption"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Dados de agendamento invalidos.";
    redirect(`/contents/${formData.get("projectId")}?scheduleError=${encodeURIComponent(message)}`);
  }

  const project = await prisma.contentProject.findFirst({
    where: { id: parsed.data.projectId, userId: user.id },
    include: {
      generatedVideos: {
        where: { status: "READY" },
        take: 1,
      },
    },
  });

  if (!project) {
    redirect(
      `/contents/${parsed.data.projectId}?scheduleError=${encodeURIComponent(
        "Voce nao tem acesso a este conteudo.",
      )}`,
    );
  }

  if (isPublishPlatformReady(parsed.data.platform) && !parsed.data.socialAccountId) {
    redirect(
      `/contents/${parsed.data.projectId}?scheduleError=${encodeURIComponent(
        `Selecione uma conta conectada do ${socialPlatformLabels[parsed.data.platform]} para agendar a publicacao.`,
      )}`,
    );
  }

  if (parsed.data.socialAccountId) {
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        id: parsed.data.socialAccountId,
        userId: user.id,
        platform: parsed.data.platform,
        isActive: true,
      },
      select: {
        id: true,
        reauthRequired: true,
      },
    });

    if (!socialAccount) {
      redirect(
        `/contents/${parsed.data.projectId}?scheduleError=${encodeURIComponent(
          `A conta selecionada nao esta conectada para ${socialPlatformLabels[parsed.data.platform]}.`,
        )}`,
      );
    }

    if (socialAccount.reauthRequired) {
      redirect(
        `/contents/${parsed.data.projectId}?scheduleError=${encodeURIComponent(
          `A conta do ${socialPlatformLabels[parsed.data.platform]} precisa ser reconectada antes do agendamento.`,
        )}`,
      );
    }
  }

  if (project.generatedVideos.length === 0) {
    redirect(
      `/contents/${project.id}?scheduleError=${encodeURIComponent(
        "Gere um video antes de agendar a postagem.",
      )}`,
    );
  }

  let scheduledAt: Date;

  try {
    scheduledAt = parseScheduledAt(parsed.data.date, parsed.data.time);
    assertFutureSchedule(scheduledAt);
  } catch (error) {
    const message = normalizeSafeError(error, SCHEDULE_PAST_DATE_ERROR);
    redirect(`/contents/${project.id}?scheduleError=${encodeURIComponent(message)}`);
  }

  await prisma.$transaction([
    prisma.scheduledPost.create({
      data: {
        projectId: project.id,
        platform: parsed.data.platform,
        socialAccountId: parsed.data.socialAccountId || null,
        scheduledAt,
        caption: parsed.data.caption,
        visibility: parsed.data.visibility || "private",
        status: "SCHEDULED",
      },
    }),
    prisma.contentProject.update({
      where: { id: project.id },
      data: { status: "SCHEDULED" },
    }),
  ]);

  revalidatePath("/schedule");
  revalidatePath("/contents");
  revalidatePath(`/contents/${project.id}`);
  redirect("/schedule?scheduled=1");
}

export async function processDueScheduledPostsAction() {
  const user = await requireUser();
  await publishDueScheduledPosts(user.id);

  revalidatePath("/schedule");
  revalidatePath("/contents");
  redirect("/schedule?processed=1");
}
