import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/social/publisher", () => ({
  socialPublisher: {
    publishNow: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialAccount: {
      findUnique: vi.fn(),
    },
    contentProject: {
      update: vi.fn(),
    },
    scheduledPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations as Promise<unknown>[])),
  },
}));

import { prisma } from "@/lib/prisma";
import { socialPublisher } from "@/integrations/social/publisher";
import {
  publishDueScheduledPosts,
  publishScheduledPostNow,
} from "@/integrations/social/publish-orchestrator";

const mockedPrisma = vi.mocked(prisma);
const mockedSocialPublisher = vi.mocked(socialPublisher);

function makeScheduledPost() {
  return {
    id: "scheduled-1",
    socialAccountId: "social-1",
    projectId: "project-1",
    caption: "Legenda",
    visibility: "private",
    socialAccount: {
      id: "social-1",
      platform: "YOUTUBE",
      isActive: true,
      reauthRequired: false,
    },
    project: {
      id: "project-1",
      title: "Projeto",
      generatedVideos: [{ path: "storage/generated/project-1/video.mp4" }],
    },
  };
}

describe("publish orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims a scheduled post before publishing", async () => {
    mockedPrisma.scheduledPost.findUnique.mockResolvedValue(makeScheduledPost());
    mockedPrisma.scheduledPost.updateMany.mockResolvedValue({ count: 1 });
    mockedSocialPublisher.publishNow.mockResolvedValue({
      providerPostId: "provider-1",
      providerStatus: "published",
      visibility: "private",
    });
    mockedPrisma.scheduledPost.update.mockResolvedValue({ id: "scheduled-1" });
    mockedPrisma.contentProject.update.mockResolvedValue({ id: "project-1" });

    await publishScheduledPostNow("scheduled-1");

    expect(mockedPrisma.scheduledPost.updateMany).toHaveBeenCalledWith({
      where: {
        id: "scheduled-1",
        status: "SCHEDULED",
        publishAttemptedAt: null,
      },
      data: expect.objectContaining({
        publishAttemptedAt: expect.any(Date),
        publishErrorCode: null,
        publishErrorMessage: null,
      }),
    });
    expect(mockedSocialPublisher.publishNow).toHaveBeenCalledTimes(1);
  });

  it("does not mark a post as failed when another worker already claimed it", async () => {
    mockedPrisma.scheduledPost.findMany.mockResolvedValue([{ id: "scheduled-1" }]);
    mockedPrisma.scheduledPost.findUnique
      .mockResolvedValueOnce(makeScheduledPost())
      .mockResolvedValueOnce({
        status: "SCHEDULED",
        publishAttemptedAt: new Date("2026-04-26T12:00:00.000Z"),
        publishedAt: null,
      });
    mockedPrisma.scheduledPost.updateMany.mockResolvedValue({ count: 0 });

    const result = await publishDueScheduledPosts("user-1");

    expect(result).toEqual([
      {
        id: "scheduled-1",
        ok: false,
        message: "Este agendamento ja esta sendo processado por outra execucao.",
      },
    ]);
    expect(mockedPrisma.scheduledPost.update).not.toHaveBeenCalled();
    expect(mockedSocialPublisher.publishNow).not.toHaveBeenCalled();
  });
});
