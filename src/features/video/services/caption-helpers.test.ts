import { describe, expect, it } from "vitest";
import {
  CAPTION_SYNC_WARNING,
  createFallbackCaptionCues,
  createTranscribedCaptionCues,
  escapeAssText,
  extractSpokenCaptionText,
  mergeOrphanSegments,
  normalizeCaptionText,
  splitCaptionIntoSegments,
} from "@/features/video/services/caption-helpers";
import type { TranscriptionSegment } from "@/features/video/services/transcription-service";

describe("caption helpers", () => {
  it("extracts only spoken VOZ OFF lines from a scene script", () => {
    const script = `CENA 1: floresta\nTEXTO NA TELA: Brasil\nVOZ OFF: Respeite a terra.\n(beat)\nVOZ OFF: Valorize a vida.`;

    expect(extractSpokenCaptionText(script)).toBe("Respeite a terra. Valorize a vida.");
  });

  it("normalizes quotes, emoji, stray slashes and spacing while preserving hashtags", () => {
    expect(normalizeCaptionText(`"Respeite"  a vida 😊 \\ #hashtag !`)).toBe(
      "Respeite a vida #hashtag!",
    );
  });

  it("splits long Portuguese captions into readable two-line blocks", () => {
    const segments = splitCaptionIntoSegments(
      "A riqueza e a resistencia dos povos indigenas do Brasil revelam uma historia viva.",
    );

    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.split("\\N").length).toBeLessThanOrEqual(2);
      expect(segment.replace(/\\N/g, " ").length).toBeLessThanOrEqual(46);
    }
  });

  it("merges orphan words with adjacent segments", () => {
    const merged = mergeOrphanSegments(["A forca da", "terra", "protege a", "vida"]);

    expect(merged.map((segment) => segment.replace(/\\N/g, " ").trim())).not.toContain("terra");
    expect(merged.map((segment) => segment.replace(/\\N/g, " ").trim())).not.toContain("vida");
    expect(merged.join(" ")).toContain("terra");
    expect(merged.join(" ")).toContain("vida");
  });

  it("uses Whisper timings but original caption words when Whisper text is wrong", () => {
    const transcription: TranscriptionSegment[] = [
      {
        start: 0,
        end: 2,
        text: "Expeite valorize",
        words: [
          { word: "Expeite", start: 0.1, end: 0.8, confidence: 0.31 },
          { word: "valorize", start: 0.9, end: 1.8, confidence: 0.95 },
        ],
      },
      {
        start: 2,
        end: 4,
        text: "aprenda resteque",
        words: [
          { word: "aprenda", start: 2.1, end: 2.8, confidence: 0.96 },
          { word: "resteque", start: 2.9, end: 3.7, confidence: 0.2 },
        ],
      },
    ];

    const result = createTranscribedCaptionCues(
      transcription,
      "Respeite, valorize, aprenda, hashtag.",
      4,
    );
    const text = result.cues.map((cue) => cue.text.replace(/\\N/g, " ")).join(" ");

    expect(text).toContain("Respeite");
    expect(text).toContain("hashtag");
    expect(text).not.toContain("Expeite");
    expect(text).not.toContain("resteque");
    expect(result.cues[0].start).toBeGreaterThanOrEqual(0);
    expect(result.cues.at(-1)?.end).toBeLessThanOrEqual(4);
  });

  it("creates fallback cues over the full audio duration when transcription is unavailable", () => {
    const cues = createFallbackCaptionCues(
      "Voce esta perdendo tempo criando conteudo manualmente. Com automacao, sua marca posta mais rapido.",
      8,
    );

    expect(cues.length).toBeGreaterThan(1);
    expect(cues[0].start).toBe(0);
    expect(cues.at(-1)?.end).toBe(8);
  });

  it("returns a quality warning when alignment is weak", () => {
    const result = createTranscribedCaptionCues(
      [{ start: 0, end: 2, text: "texto diferente sem contexto" }],
      "Respeite a terra e valorize a vida",
      2,
    );

    expect(result.quality.warning).toBe(CAPTION_SYNC_WARNING);
  });

  it("escapes ASS override braces without removing intended line breaks", () => {
    expect(escapeAssText("{\\pos(10,10)}Linha 1\nLinha 2")).toBe(
      "\\{pos(10,10)\\}Linha 1\\NLinha 2",
    );
  });
});
