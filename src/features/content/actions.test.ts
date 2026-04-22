import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "user@example.com", name: null })),
}));

vi.mock("@/lib/storage/local-storage", () => ({
  deleteProjectStorage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { deleteProjectStorage } from "@/lib/storage/local-storage";
import { deleteContentProjectAction } from "@/features/content/actions";

const mockedPrisma = vi.mocked(prisma);
const mockedDeleteProjectStorage = vi.mocked(deleteProjectStorage);

describe("content actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes only owned projects and cleans generated paths", async () => {
    mockedPrisma.contentProject.findFirst.mockResolvedValue({
      id: "project-1",
      generatedVideos: [{ path: "storage/generated/project-1/video-a.mp4" }],
      mediaFiles: [],
      scheduledPosts: [],
    });
    mockedPrisma.contentProject.delete.mockResolvedValue({ id: "project-1" });
    mockedDeleteProjectStorage.mockResolvedValue(undefined);

    await expect(deleteContentProjectAction("project-1")).rejects.toThrow("REDIRECT:/contents");

    expect(mockedPrisma.contentProject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "project-1", userId: "user-1" },
      }),
    );
    expect(mockedDeleteProjectStorage).toHaveBeenCalledWith("project-1", [
      "storage/generated/project-1/video-a.mp4",
    ]);
  });
});
