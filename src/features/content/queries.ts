import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [total, ready, failed, latest] = await Promise.all([
    prisma.content.count(),
    prisma.content.count({ where: { status: "READY" } }),
    prisma.content.count({ where: { status: "FAILED" } }),
    prisma.content.findMany({
      include: { assets: true },
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
  return prisma.content.findMany({
    include: { assets: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContentById(id: string) {
  return prisma.content.findUnique({
    where: { id },
    include: { assets: true },
  });
}
