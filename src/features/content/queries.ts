import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [total, ready, failed, draft, latest] = await Promise.all([
    prisma.contentProject.count(),
    prisma.contentProject.count({ where: { status: "READY" } }),
    prisma.contentProject.count({ where: { status: "ERROR" } }),
    prisma.contentProject.count({ where: { status: "DRAFT" } }),
    prisma.contentProject.findMany({
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

export async function getContents() {
  return prisma.contentProject.findMany({
    include: {
      mediaFiles: true,
      generatedVideos: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContentById(id: string) {
  return prisma.contentProject.findUnique({
    where: { id },
    include: {
      mediaFiles: true,
      generatedVideos: { orderBy: { createdAt: "desc" } },
    },
  });
}
