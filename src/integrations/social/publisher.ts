import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishVideoToInstagram } from "@/integrations/social/instagram/publisher";
import { publishVideoToTikTok } from "@/integrations/social/tiktok/publisher";
import { publishVideoToYouTube } from "@/integrations/social/youtube/publisher";

export type SocialPlatform = "instagram" | "tiktok" | "youtube";

export type PublishRequest = {
  socialAccountId: string;
  contentId: string;
  videoPath: string;
  title: string;
  caption: string;
  visibility?: string | null;
  scheduledPostId?: string;
};

export type PublishResult = {
  providerPostId: string;
  providerStatus: string;
  visibility: string;
  videoUrl?: string;
};

export interface SocialPublisher {
  publishNow(request: PublishRequest): Promise<PublishResult>;
}

export class SocialPublishingNotConfiguredError extends Error {
  constructor(platform: string) {
    super(`Publicacao para ${platform} ainda nao esta configurada.`);
  }
}

async function createJobRun(input: {
  socialAccountId: string;
  contentId: string;
  scheduledPostId?: string;
  payload: Record<string, unknown>;
}) {
  const account = await prisma.socialAccount.findUniqueOrThrow({
    where: { id: input.socialAccountId },
    select: { userId: true },
  });

  return prisma.jobRun.create({
    data: {
      name: "SCHEDULE_PUBLISH",
      status: "RUNNING",
      userId: account.userId,
      projectId: input.contentId,
      scheduledPostId: input.scheduledPostId ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      startedAt: new Date(),
    },
  });
}

async function finishJobRun(jobRunId: string, status: "COMPLETED" | "FAILED", errorMessage?: string) {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
      failedAt: status === "FAILED" ? new Date() : null,
      errorMessage: errorMessage ?? null,
    },
  });
}

export const socialPublisher: SocialPublisher = {
  async publishNow(request) {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: request.socialAccountId },
      select: {
        id: true,
        platform: true,
        reauthRequired: true,
        isActive: true,
      },
    });

    if (!socialAccount?.isActive) {
      throw new Error("Conta social inativa ou nao encontrada.");
    }

    if (socialAccount.reauthRequired) {
      throw new Error("A conta conectada exige nova autenticacao antes de publicar.");
    }

    const jobRun = await createJobRun({
      socialAccountId: request.socialAccountId,
      contentId: request.contentId,
      scheduledPostId: request.scheduledPostId,
      payload: {
        platform: socialAccount.platform,
        visibility: request.visibility,
      },
    });

    try {
      const result =
        socialAccount.platform === "INSTAGRAM"
          ? await publishVideoToInstagram({
              socialAccountId: request.socialAccountId,
              caption: request.caption,
              videoPath: request.videoPath,
            })
          : socialAccount.platform === "TIKTOK"
            ? await publishVideoToTikTok({
                socialAccountId: request.socialAccountId,
                caption: request.caption,
                videoPath: request.videoPath,
                visibility: request.visibility,
              })
            : socialAccount.platform === "YOUTUBE"
              ? await publishVideoToYouTube({
                  socialAccountId: request.socialAccountId,
                  title: request.title,
                  description: request.caption,
                  videoPath: request.videoPath,
                  visibility: request.visibility,
                })
              : (() => {
                  throw new SocialPublishingNotConfiguredError(socialAccount.platform);
                })();

      await finishJobRun(jobRun.id, "COMPLETED");
      return result;
    } catch (error) {
      await finishJobRun(
        jobRun.id,
        "FAILED",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  },
};
