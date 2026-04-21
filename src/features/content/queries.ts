import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [total, ready, failed, latest] = await Promise.all([
    prisma.contentProject.count(),
    prisma.contentProject.count({ where: { status: "READY" } }),
    prisma.contentProject.count({ where: { status: "ERROR" } }),
    prisma.contentProject.findMany({
      include: { mediaFiles: true, generatedVideos: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    total,
    ready,
    failed,
    draft: total - ready - failed,
    latest,
  };
}

export async function getContents() {
  return prisma.contentProject.findMany({
    include: { mediaFiles: true, generatedVideos: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContentById(id: string) {
  return prisma.contentProject.findUnique({
    where: { id },
    include: { mediaFiles: true, generatedVideos: true },
  });
}
