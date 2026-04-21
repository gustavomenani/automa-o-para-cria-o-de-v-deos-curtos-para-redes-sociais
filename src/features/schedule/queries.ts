import { prisma } from "@/lib/prisma";

export async function getScheduledPosts() {
  return prisma.scheduledPost.findMany({
    include: {
      project: {
        include: {
          generatedVideos: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });
}
