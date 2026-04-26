import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/manus/manus-service", () => ({
  manusService: {
    getNormalizedTaskResult: vi.fn(),
  },
}));

vi.mock("@/lib/storage/local-storage", () => ({
  saveGeneratedAsset: vi.fn(),
}));

vi.mock("./asset-generation-run-service", () => ({
  startAssetGenerationRun: vi.fn(),
  updateAssetGenerationRun: vi.fn(),
  completeAssetGenerationRun: vi.fn(),
  failAssetGenerationRun: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mediaFile: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    assetGenerationRun: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        contentProject: {
          update: vi.fn(),
        },
        mediaFile: {
          createMany: vi.fn(),
        },
      }),
    ),
  },
}));

import { prisma } from "@/lib/prisma";
import { manusService } from "@/integrations/manus/manus-service";
import { syncPendingManusRunForProject } from "@/features/content/services/ai-asset-orchestrator";

const mockedPrisma = vi.mocked(prisma);
const mockedManusService = vi.mocked(manusService);

describe("syncPendingManusRunForProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not re-import assets when the latest Manus run is already completed", async () => {
    mockedPrisma.contentProject.findUnique.mockResolvedValue({
      id: "project-1",
      title: "Projeto",
      caption: "Legenda",
      assetGenerationRuns: [
        {
          id: "run-1",
          provider: "MANUS",
          providerTaskId: "task-1",
          status: "COMPLETED",
          summary: null,
        },
      ],
    });

    const result = await syncPendingManusRunForProject("project-1");

    expect(result).toEqual({ completed: true });
    expect(mockedManusService.getNormalizedTaskResult).not.toHaveBeenCalled();
    expect(mockedPrisma.assetGenerationRun.updateMany).not.toHaveBeenCalled();
  });

  it("returns control when another worker already claimed Manus finalization", async () => {
    mockedPrisma.contentProject.findUnique.mockResolvedValue({
      id: "project-1",
      title: "Projeto",
      caption: "Legenda",
      assetGenerationRuns: [
        {
          id: "run-1",
          provider: "MANUS",
          providerTaskId: "task-1",
          status: "RUNNING",
          summary: null,
        },
      ],
    });
    mockedManusService.getNormalizedTaskResult.mockResolvedValue({
      providerTaskId: "task-1",
      status: "COMPLETED",
      missingAssets: { images: false, audio: false },
      assets: { images: [], audio: [] },
      warnings: [],
      rawText: "ok",
      taskStatus: "stopped",
    });
    mockedPrisma.assetGenerationRun.updateMany.mockResolvedValue({ count: 0 });
    mockedPrisma.assetGenerationRun.findUnique.mockResolvedValue({
      status: "COMPLETED",
      summary: null,
    });

    const result = await syncPendingManusRunForProject("project-1");

    expect(result).toEqual({ completed: true });
  });
});
