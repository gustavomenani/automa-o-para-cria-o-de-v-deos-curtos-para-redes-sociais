import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contentProject: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { createProjectWithUploads } from "@/features/content/services/upload-service";

const mockedPrisma = vi.mocked(prisma);

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("upload service validation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid signatures before project creation", async () => {
    await expect(
      createProjectWithUploads(
        {
          title: "Projeto",
          prompt: "Prompt valido",
          contentType: "REELS",
        },
        {
          images: [file([0x49, 0x44, 0x33], "fake.png", "image/png")],
          audio: file([0x49, 0x44, 0x33], "audio.mp3", "audio/mpeg"),
        },
        "user-1",
      ),
    ).rejects.toThrow("Arquivo recusado.");

    expect(mockedPrisma.contentProject.create).not.toHaveBeenCalled();
  });
});
