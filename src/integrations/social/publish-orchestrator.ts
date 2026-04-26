import { prisma } from "@/lib/prisma";
import { socialPublisher } from "@/integrations/social/publisher";

class ScheduledPostPublishConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduledPostPublishConflictError";
  }
}

async function getGeneratedVideo(projectId: string) {
  const project = await prisma.contentProject.findUnique({
    where: { id: projectId },
    include: {
      generatedVideos: {
        where: { status: "READY" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!project || project.generatedVideos.length === 0) {
    throw new Error("Gere um video antes de publicar.");
  }

  return {
    project,
    video: project.generatedVideos[0],
  };
}

async function claimScheduledPostForPublish(scheduledPostId: string) {
  const claimTimestamp = new Date();
  const claimed = await prisma.scheduledPost.updateMany({
    where: {
      id: scheduledPostId,
      status: "SCHEDULED",
      publishAttemptedAt: null,
    },
    data: {
      publishAttemptedAt: claimTimestamp,
      publishErrorCode: null,
      publishErrorMessage: null,
    },
  });

  if (claimed.count > 0) {
    return claimTimestamp;
  }

  const existing = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    select: {
      status: true,
      publishAttemptedAt: true,
      publishedAt: true,
    },
  });

  if (!existing) {
    throw new Error("Agendamento nao encontrado.");
  }

  if (existing.status === "PUBLISHED" || existing.publishedAt) {
    throw new ScheduledPostPublishConflictError("Este agendamento ja foi publicado.");
  }

  if (existing.status === "FAILED") {
    throw new ScheduledPostPublishConflictError(
      "Este agendamento ja falhou e precisa ser revisado antes de nova tentativa.",
    );
  }

  if (existing.publishAttemptedAt) {
    throw new ScheduledPostPublishConflictError(
      "Este agendamento ja esta sendo processado por outra execucao.",
    );
  }

  throw new ScheduledPostPublishConflictError(
    "Nao foi possivel reservar o agendamento para publicacao.",
  );
}

export async function publishProjectNow(input: {
  projectId: string;
  socialAccountId: string;
  caption: string;
  visibility?: string | null;
}) {
  const { project, video } = await getGeneratedVideo(input.projectId);
  const socialAccount = await prisma.socialAccount.findUnique({
    where: { id: input.socialAccountId },
    select: { platform: true },
  });

  if (!socialAccount) {
    throw new Error("Conta social nao encontrada.");
  }

  const result = await socialPublisher.publishNow({
    socialAccountId: input.socialAccountId,
    contentId: project.id,
    videoPath: video.path,
    title: project.title,
    caption: input.caption,
    visibility: input.visibility,
  });

  const scheduledPost = await prisma.scheduledPost.create({
    data: {
      projectId: project.id,
      socialAccountId: input.socialAccountId,
      platform: socialAccount.platform,
      scheduledAt: new Date(),
      caption: input.caption,
      visibility: result.visibility,
      providerPostId: result.providerPostId,
      providerStatus: result.providerStatus,
      publishedAt: new Date(),
      publishAttemptedAt: new Date(),
      status: "PUBLISHED",
    },
  });

  await prisma.contentProject.update({
    where: { id: project.id },
    data: { status: "PUBLISHED", errorMessage: null },
  });

  return { result, scheduledPost };
}

export async function publishScheduledPostNow(scheduledPostId: string) {
  const scheduledPost = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: {
      socialAccount: true,
      project: {
        include: {
          generatedVideos: {
            where: { status: "READY" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!scheduledPost?.socialAccount) {
    throw new Error("Agendamento sem conta conectada valida.");
  }

  if (scheduledPost.project.generatedVideos.length === 0) {
    throw new Error("Gere um video antes de publicar.");
  }

  await claimScheduledPostForPublish(scheduledPost.id);

  const result = await socialPublisher.publishNow({
    socialAccountId: scheduledPost.socialAccountId!,
    scheduledPostId: scheduledPost.id,
    contentId: scheduledPost.projectId,
    videoPath: scheduledPost.project.generatedVideos[0].path,
    title: scheduledPost.project.title,
    caption: scheduledPost.caption,
    visibility: scheduledPost.visibility,
  });

  await prisma.$transaction([
    prisma.scheduledPost.update({
      where: { id: scheduledPost.id },
      data: {
        providerPostId: result.providerPostId,
        providerStatus: result.providerStatus,
        publishAttemptedAt: new Date(),
        publishedAt: new Date(),
        status: "PUBLISHED",
        publishErrorCode: null,
        publishErrorMessage: null,
      },
    }),
    prisma.contentProject.update({
      where: { id: scheduledPost.projectId },
      data: { status: "PUBLISHED", errorMessage: null },
    }),
  ]);

  return result;
}

export async function publishDueScheduledPosts(userId: string) {
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      status: "SCHEDULED",
      publishAttemptedAt: null,
      scheduledAt: { lte: new Date() },
      socialAccount: {
        userId,
        isActive: true,
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const results: Array<{ id: string; ok: boolean; message?: string }> = [];

  for (const post of duePosts) {
    try {
      await publishScheduledPostNow(post.id);
      results.push({ id: post.id, ok: true });
    } catch (error) {
      if (error instanceof ScheduledPostPublishConflictError) {
        results.push({
          id: post.id,
          ok: false,
          message: error.message,
        });
        continue;
      }

      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          publishAttemptedAt: new Date(),
          publishErrorMessage: error instanceof Error ? error.message : String(error),
        },
      });
      results.push({
        id: post.id,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
