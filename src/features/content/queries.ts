import { prisma } from "@/lib/prisma";

export async function getDashboardStats(userId: string) {
  const [total, ready, failed, draft, latest] = await Promise.all([
    prisma.contentProject.count({ where: { userId } }),
    prisma.contentProject.count({ where: { userId, status: "READY" } }),
    prisma.contentProject.count({ where: { userId, status: "ERROR" } }),
    prisma.contentProject.count({ where: { userId, status: "DRAFT" } }),
    prisma.contentProject.findMany({
      where: { userId },
      include: {
        mediaFiles: true,
        generatedVideos: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    total,
    ready,
    failed,
    draft,
    latest,
  };
}

export async function getContents(userId: string) {
  return prisma.contentProject.findMany({
    where: { userId },
    include: {
      mediaFiles: true,
      generatedVideos: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContentById(id: string, userId: string) {
  return prisma.contentProject.findFirst({
    where: { id, userId },
    include: {
      mediaFiles: true,
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
    },
  });
}
