import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvedStorageRoot, toPublicFileUrl } from "@/lib/paths";

describe("public file paths", () => {
  it("builds public urls only for files inside the configured storage root", () => {
    const url = toPublicFileUrl(path.join(resolvedStorageRoot, "uploads", "project-1", "image.png"));

    expect(url).toBe("/api/files/uploads/project-1/image.png");
  });

  it("rejects paths outside the configured storage root", () => {
    expect(() => toPublicFileUrl(path.join(path.dirname(resolvedStorageRoot), "secret.txt"))).toThrow(
      "Arquivo fora do storage publico configurado.",
    );
  });
});
