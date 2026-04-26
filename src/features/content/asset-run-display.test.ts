import { describe, expect, it } from "vitest";
import {
  formatAssetRunStatus,
  formatProviderName,
  getDisplaySafeMessage,
  getMissingAssets,
  maskProviderTaskId,
} from "./asset-run-display";

describe("asset run display helpers", () => {
  it("formats provider and run status labels for user-facing UI", () => {
    expect(formatProviderName("MANUS")).toBe("Manus");
    expect(formatProviderName("GEMINI")).toBe("Gemini");
    expect(formatAssetRunStatus("MANUAL_ACTION_REQUIRED")).toBe("acao manual requerida");
    expect(formatAssetRunStatus("PARTIAL")).toBe("partial");
  });

  it("normalizes missing asset payloads", () => {
    expect(getMissingAssets({ images: true, audio: false })).toEqual({
      images: true,
      audio: false,
    });
    expect(getMissingAssets(["raw"])).toEqual({ images: false, audio: false });
    expect(getMissingAssets(null)).toEqual({ images: false, audio: false });
  });

  it("masks provider task ids without leaking full identifiers", () => {
    expect(maskProviderTaskId("task_1234567890abcdef")).toBe("task_123...cdef");
    expect(maskProviderTaskId("short")).toBe("short");
    expect(maskProviderTaskId(null)).toBe("nao informado");
  });

  it("filters internal diagnostics from rendered provider messages", () => {
    const fallback = "Mensagem segura.";

    expect(getDisplaySafeMessage("C:\\Users\\User\\.env MANUS_API_KEY=secret", fallback)).toBe(
      fallback,
    );
    expect(
      getDisplaySafeMessage(
        "MANUS_API_KEY nao configurada. Cadastre a chave em /settings ou no arquivo .env.",
        fallback,
      ),
    ).toBe("MANUS_API_KEY nao configurada. Cadastre a chave em /settings ou no arquivo .env.");
    expect(getDisplaySafeMessage('{"error":"raw provider payload"}', fallback)).toBe(fallback);
    expect(getDisplaySafeMessage("Plano textual gerado sem audio.", fallback)).toBe(
      "Plano textual gerado sem audio.",
    );
  });
});
