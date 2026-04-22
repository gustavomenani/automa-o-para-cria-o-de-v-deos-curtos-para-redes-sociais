import path from "node:path";
import { describe, expect, it } from "vitest";
import { deleteProjectStorage, getGeneratedVideoPath } from "@/lib/storage/local-storage";
import { storageRoot } from "@/lib/paths";

describe("local storage guards", () => {
  it("creates unique generated paths under storage root", async () => {
    const output = await getGeneratedVideoPath("project-a", "video-a");

    expect(output.replace(/\\/g, "/")).toContain("storage/generated/project-a/video-a.mp4");
  });

  it("rejects generated delete paths outside storage root", async () => {
    const unsafePath = path.resolve(storageRoot, "..", "outside.mp4");

    await expect(deleteProjectStorage("missing-project", [unsafePath])).rejects.toThrow(
      "Caminho de storage invalido para exclusao.",
    );
  });
});
