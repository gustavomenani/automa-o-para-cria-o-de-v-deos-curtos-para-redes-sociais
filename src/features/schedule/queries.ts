import { prisma } from "@/lib/prisma";

export async function getScheduledPosts(userId: string) {
  return prisma.scheduledPost.findMany({
    where: { project: { userId } },
    include: {
      socialAccount: true,
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
