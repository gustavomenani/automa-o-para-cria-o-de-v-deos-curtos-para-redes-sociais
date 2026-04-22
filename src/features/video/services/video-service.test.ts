import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  GENERATION_LOCKED_MESSAGE,
  GenerationLockedError,
  acquireGenerationLock,
} from "@/features/video/services/video-service";
import { getGeneratedVideoPath } from "@/lib/storage/local-storage";

const mockedPrisma = vi.mocked(prisma);

describe("video generation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when a project is already processing", async () => {
    mockedPrisma.contentProject.updateMany.mockResolvedValue({ count: 0 });

    await expect(acquireGenerationLock("project-1")).rejects.toThrow(GENERATION_LOCKED_MESSAGE);
    await expect(acquireGenerationLock("project-1")).rejects.toBeInstanceOf(GenerationLockedError);
  });

  it("acquires the lock with a conditional processing transition", async () => {
    mockedPrisma.contentProject.updateMany.mockResolvedValue({ count: 1 });

    await expect(acquireGenerationLock("project-1")).resolves.toBeUndefined();
    expect(mockedPrisma.contentProject.updateMany).toHaveBeenCalledWith({
      where: {
        id: "project-1",
        status: { not: "PROCESSING" },
      },
      data: {
        status: "PROCESSING",
        errorMessage: null,
      },
    });
  });

  it("uses per-generated-video output paths", async () => {
    const pathA = await getGeneratedVideoPath("project-1", "video-a");
    const pathB = await getGeneratedVideoPath("project-1", "video-b");

    expect(pathA).not.toBe(pathB);
    expect(pathA.replace(/\\/g, "/")).toContain("generated/project-1/video-a.mp4");
  });
});
