import { describe, expect, it, vi } from "vitest";
import {
  MEDIA_LIMITS,
  MediaValidationError,
  detectMediaSignature,
  validateMediaFiles,
} from "@/features/content/services/media-validation";

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2];
const jpg = [0xff, 0xd8, 0xff, 1, 2, 3];
const webp = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const mp3 = [0x49, 0x44, 0x33, 1, 2, 3];
const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45];
const m4a = [0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 1, 2, 3];

describe("media validation", () => {
  it("detects accepted media signatures", () => {
    expect(detectMediaSignature(new Uint8Array(png))?.mimeType).toBe("image/png");
    expect(detectMediaSignature(new Uint8Array(jpg))?.mimeType).toBe("image/jpeg");
    expect(detectMediaSignature(new Uint8Array(webp))?.mimeType).toBe("image/webp");
    expect(detectMediaSignature(new Uint8Array(mp3))?.mimeType).toBe("audio/mpeg");
    expect(detectMediaSignature(new Uint8Array(wav))?.mimeType).toBe("audio/wav");
    expect(detectMediaSignature(new Uint8Array(m4a))?.mimeType).toBe("audio/mp4");
  });

  it("accepts valid images and audio", async () => {
    await expect(
      validateMediaFiles(
        {
          images: [file(png, "a.png", "image/png")],
          audio: file(mp3, "a.mp3", "audio/mpeg"),
        },
        { probeAudioDuration: vi.fn(async () => 30) },
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects spoofed MIME types as formato", async () => {
    await expect(
      validateMediaFiles(
        {
          images: [file(mp3, "fake.png", "image/png")],
          audio: file(mp3, "a.mp3", "audio/mpeg"),
        },
        { probeAudioDuration: vi.fn(async () => 30) },
      ),
    ).rejects.toMatchObject({ category: "formato" });
  });

  it("rejects excessive image counts", async () => {
    const images = Array.from({ length: MEDIA_LIMITS.maxImages + 1 }, (_, index) =>
      file(png, `${index}.png`, "image/png"),
    );

    await expect(
      validateMediaFiles({ images, audio: file(mp3, "a.mp3", "audio/mpeg") }),
    ).rejects.toMatchObject({ category: "quantidade" });
  });

  it("rejects oversized files", async () => {
    const oversized = new File([new Uint8Array(MEDIA_LIMITS.maxFileBytes + 1)], "a.png", {
      type: "image/png",
    });

    await expect(
      validateMediaFiles({ images: [oversized], audio: file(mp3, "a.mp3", "audio/mpeg") }),
    ).rejects.toMatchObject({ category: "tamanho" });
  });

  it("rejects long audio", async () => {
    await expect(
      validateMediaFiles(
        {
          images: [file(png, "a.png", "image/png")],
          audio: file(mp3, "a.mp3", "audio/mpeg"),
        },
        { probeAudioDuration: vi.fn(async () => MEDIA_LIMITS.maxAudioSeconds + 1) },
      ),
    ).rejects.toBeInstanceOf(MediaValidationError);
  });
});
