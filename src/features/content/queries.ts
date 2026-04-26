import { prisma } from "@/lib/prisma";

export async function getDashboardStats(userId: string) {
  const [total, ready, failed, draft, latest, latestPublishedPost, latestFailedPost, latestManusRun] =
    await Promise.all([
    prisma.contentProject.count({ where: { userId } }),
    prisma.contentProject.count({ where: { userId, status: "READY" } }),
    prisma.contentProject.count({ where: { userId, status: "ERROR" } }),
    prisma.contentProject.count({ where: { userId, status: "DRAFT" } }),
    prisma.contentProject.findMany({
      where: { userId },
      include: {
        mediaFiles: { orderBy: { createdAt: "asc" } },
        generatedVideos: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.scheduledPost.findFirst({
      where: {
        project: { userId },
        status: "PUBLISHED",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        socialAccount: {
          select: {
            accountName: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.scheduledPost.findFirst({
      where: {
        project: { userId },
        status: "FAILED",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.assetGenerationRun.findFirst({
      where: {
        provider: "MANUS",
        project: { userId },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    ready,
    failed,
    draft,
    latest,
    latestPublishedPost,
    latestFailedPost,
    latestManusRun,
  };
}

export async function getContents(userId: string) {
  return prisma.contentProject.findMany({
    where: { userId },
    include: {
      mediaFiles: { orderBy: { createdAt: "asc" } },
      generatedVideos: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContentById(id: string, userId: string) {
  return prisma.contentProject.findFirst({
    where: { id, userId },
    include: {
      mediaFiles: { orderBy: { createdAt: "asc" } },
      generatedVideos: { orderBy: { createdAt: "desc" } },
      assetGenerationRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          provider: true,
          providerTaskId: true,
          status: true,
          summary: true,
          missingAssets: true,
          startedAt: true,
          finishedAt: true,
        },
      },
      scheduledPosts: {
        orderBy: { scheduledAt: "desc" },
        include: {
          socialAccount: {
            select: {
              id: true,
              accountName: true,
              platform: true,
            },
          },
        },
        take: 12,
      },
      jobRuns: {
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          logs: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      },
    },
  });
}
