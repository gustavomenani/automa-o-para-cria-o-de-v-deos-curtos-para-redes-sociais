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

vi.mock("@/features/content/services/upload-service", () => ({
  parseProjectFormData: vi.fn(() => ({
    input: { prompt: "roteiro de 90 segundos" },
    files: [],
  })),
  createContentProject: vi.fn(async () => ({ id: "project-1" })),
  createProjectWithUploads: vi.fn(),
}));

vi.mock("@/features/content/services/ai-asset-orchestrator", () => ({
  runAssetPipelineForProject: vi.fn(),
  syncPendingManusRunForProject: vi.fn(),
}));

vi.mock("@/features/video/services/video-service", () => ({
  videoService: {
    generateProjectVideo: vi.fn(),
  },
}));

vi.mock("@/lib/storage/local-storage", () => ({
  deleteProjectStorage: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { runAssetPipelineForProject } from "@/features/content/services/ai-asset-orchestrator";
import { videoService } from "@/features/video/services/video-service";
import { createContentAction } from "@/features/content/actions";

const mockedPrisma = vi.mocked(prisma);
const mockedRunAssetPipelineForProject = vi.mocked(runAssetPipelineForProject);
const mockedVideoService = vi.mocked(videoService);

describe("create content action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps Manus auto-generated projects as READY after successful video generation", async () => {
    mockedRunAssetPipelineForProject.mockResolvedValue({
      status: "COMPLETED",
      images: [{ path: "storage/uploads/project-1/image-1.png" }],
      audio: { path: "storage/uploads/project-1/audio.mp3" },
      warnings: [],
    } as Awaited<ReturnType<typeof runAssetPipelineForProject>>);
    mockedVideoService.generateProjectVideo.mockResolvedValue({
      projectId: "project-1",
      generatedVideoId: "video-1",
      path: "storage/generated/project-1/video-1.mp4",
      duration: 90,
      resolution: "1080x1920",
    });
    mockedPrisma.contentProject.update.mockResolvedValue({ id: "project-1" });

    const formData = new FormData();
    formData.set("intent", "manus");

    await expect(createContentAction(formData)).rejects.toThrow(
      "REDIRECT:/contents/project-1?manus=1&generated=1",
    );

    expect(mockedPrisma.contentProject.update).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { status: "READY" },
    });
  });

  it("does not overwrite the video service error state when rendering fails", async () => {
    mockedRunAssetPipelineForProject.mockResolvedValue({
      status: "COMPLETED",
      images: [{ path: "storage/uploads/project-1/image-1.png" }],
      audio: { path: "storage/uploads/project-1/audio.mp3" },
      warnings: [],
    } as Awaited<ReturnType<typeof runAssetPipelineForProject>>);
    mockedVideoService.generateProjectVideo.mockRejectedValue(
      new Error("Nao foi possivel gerar o video."),
    );

    const formData = new FormData();
    formData.set("intent", "manus");

    await expect(createContentAction(formData)).rejects.toThrow(
      "REDIRECT:/contents/project-1?manus=1&videoWarning=Nao+foi+possivel+gerar+o+video.",
    );

    expect(mockedPrisma.contentProject.update).not.toHaveBeenCalled();
  });
});
