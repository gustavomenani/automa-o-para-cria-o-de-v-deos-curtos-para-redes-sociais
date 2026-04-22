import type {
  TranscriptionSegment,
  TranscriptionWord,
} from "@/features/video/services/transcription-service";

export type CaptionTiming = {
  start: number;
  end: number;
};

export type CaptionCue = CaptionTiming & {
  text: string;
};

export type CaptionQuality = {
  score: number;
  warning?: string;
};

type OriginalWord = {
  word: string;
  normalized: string;
};

export const CAPTION_SYNC_WARNING =
  "A legenda foi sincronizada, mas alguns trechos podem estar aproximados. Revise o video antes de publicar.";

export const SAFE_VIDEO_GENERATION_ERROR =
  "Nao foi possivel gerar o video. Revise os arquivos enviados e tente novamente.";

export const ASS_SUBTITLE_STYLE = {
  fontName: "Arial",
  fontSize: 62,
  marginL: 70,
  marginR: 70,
  marginV: 260,
  outline: 3,
  shadow: 1,
};

const MAX_SUBTITLE_LINE_LENGTH = 22;
const MAX_SUBTITLE_SEGMENT_LENGTH = 46;
const DEFAULT_GLOSSARY = new Set([
  "reels",
  "tiktok",
  "youtube",
  "shorts",
  "instagram",
  "manus",
  "gemini",
  "ia",
  "automacao",
  "hashtag",
  "prompt",
  "story",
  "stories",
]);

export function normalizeCaptionText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[“”„‟"']/g, "")
    .replace(/[‘’‚‛]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\(\s*([,.;:!?-]+)\s*\)/g, "$1")
    .replace(/\\(?!N)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractSpokenCaptionText(text: string) {
  const spokenLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^\([^)]*\)\s*/, ""))
    .filter((line) => /^VOZ\s*OFF\s*:/i.test(line))
    .map((line) => line.replace(/^VOZ\s*OFF\s*:\s*/i, "").trim())
    .filter(Boolean);

  if (spokenLines.length > 0) {
    return spokenLines.join(" ");
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !/^CENA\s*\d+\s*:/i.test(line))
    .filter((line) => !/^TEXTO\s+NA\s+TELA\s*:/i.test(line))
    .filter((line) => !/^\([^)]*\)$/.test(line))
    .join(" ");
}

function removeDiacritics(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeForAlignment(text: string) {
  return removeDiacritics(text)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s#@]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function originalWordsFromText(text: string) {
  return normalizeCaptionText(extractSpokenCaptionText(text))
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}#@]+|[^\p{L}\p{N}#@]+$/gu, ""))
    .filter(Boolean);
}

function originalWordObjectsFromText(text: string): OriginalWord[] {
  return originalWordsFromText(text).map((word) => ({
    word,
    normalized: normalizeForAlignment(word),
  }));
}

export function flattenWhisperWords(segments: TranscriptionSegment[]) {
  const words = segments.flatMap((segment) => segment.words ?? []);

  if (words.length > 0) {
    return words;
  }

  return segments.flatMap((segment) => {
    const segmentWords = segment.text.split(/\s+/).filter(Boolean);
    const duration = Math.max(segment.end - segment.start, 0.1);
    const wordDuration = duration / Math.max(segmentWords.length, 1);

    return segmentWords.map((word, index) => ({
      word,
      start: segment.start + index * wordDuration,
      end: segment.start + (index + 1) * wordDuration,
      confidence: null,
    }));
  });
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }

    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length] ?? 0;
}

export function wordSimilarity(a: string, b: string) {
  const left = normalizeForAlignment(a);
  const right = normalizeForAlignment(b);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const maxLength = Math.max(left.length, right.length);
  return 1 - levenshteinDistance(left, right) / maxLength;
}

export function detectSuspiciousWords(whisperWords: TranscriptionWord[], originalWords: string[]) {
  const originalSet = new Set(originalWords.map(normalizeForAlignment));
  const glossary = new Set(DEFAULT_GLOSSARY);

  for (const word of originalWords) {
    const normalized = normalizeForAlignment(word);

    if (normalized.length >= 5 || /[A-Z]/.test(word) || word.startsWith("#")) {
      glossary.add(normalized);
    }
  }

  return whisperWords.filter((word) => {
    const normalized = normalizeForAlignment(word.word);

    if (!normalized) {
      return false;
    }

    if (word.confidence !== undefined && word.confidence !== null && word.confidence < 0.45) {
      return true;
    }

    if (originalSet.has(normalized) || glossary.has(normalized)) {
      return false;
    }

    return originalWords.some((originalWord) => wordSimilarity(word.word, originalWord) >= 0.55);
  });
}

export function splitCaptionIntoSegments(text: string) {
  const normalized = normalizeCaptionText(extractSpokenCaptionText(text));

  if (!normalized) {
    return [];
  }

  const source = normalized
    .split(/(?<=[.!?;:])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const segments: string[] = [];

  for (const sentence of source.length > 0 ? source : [normalized]) {
    const words = sentence.split(" ").filter(Boolean);
    let currentLine = "";
    let currentLines: string[] = [];

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (candidate.length <= MAX_SUBTITLE_LINE_LENGTH) {
        currentLine = candidate;
        continue;
      }

      if (currentLine) {
        currentLines.push(currentLine);
      }

      if (currentLines.length === 2) {
        segments.push(currentLines.join("\\N"));
        currentLines = [];
      }

      currentLine = word;
    }

    if (currentLine) {
      currentLines.push(currentLine);
    }

    if (currentLines.length > 0) {
      segments.push(currentLines.join("\\N"));
    }
  }

  return segments;
}

export function rebalanceSegmentLines(segment: string) {
  const words = segment.replace(/\\N/g, " ").split(" ").filter(Boolean);

  if (words.length <= 4 && words.join(" ").length <= MAX_SUBTITLE_LINE_LENGTH) {
    return words.join(" ");
  }

  const firstLine: string[] = [];
  const secondLine: string[] = [];

  for (const word of words) {
    const candidate = [...firstLine, word].join(" ");

    if (
      candidate.length <= MAX_SUBTITLE_LINE_LENGTH &&
      firstLine.length < Math.ceil(words.length / 2)
    ) {
      firstLine.push(word);
      continue;
    }

    secondLine.push(word);
  }

  if (secondLine.length < 2 && firstLine.length > 2) {
    secondLine.unshift(firstLine.pop() as string);
  }

  return secondLine.length > 0 ? `${firstLine.join(" ")}\\N${secondLine.join(" ")}` : firstLine.join(" ");
}

export function mergeOrphanSegments(segments: string[]) {
  const merged: string[] = [];

  for (const segment of segments) {
    const plainSegment = segment.replace(/\\N/g, " ").trim();
    const wordCount = plainSegment.split(" ").filter(Boolean).length;
    const previous = merged.at(-1);

    if (wordCount < 3 && previous) {
      const previousPlain = previous.replace(/\\N/g, " ").trim();
      const previousWords = previousPlain.split(" ").filter(Boolean);

      if (
        previousWords.length <= 8 &&
        `${previousPlain} ${plainSegment}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
      ) {
        merged[merged.length - 1] = `${previousPlain} ${plainSegment}`;
        continue;
      }
    }

    merged.push(plainSegment);
  }

  for (let index = 0; index < merged.length - 1; index += 1) {
    const currentWords = merged[index].split(" ").filter(Boolean);
    const nextWords = merged[index + 1].split(" ").filter(Boolean);

    if (
      nextWords.length < 3 &&
      `${merged[index]} ${merged[index + 1]}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
    ) {
      merged[index] = `${merged[index]} ${merged[index + 1]}`;
      merged.splice(index + 1, 1);
      index -= 1;
    } else if (
      currentWords.length < 3 &&
      `${merged[index]} ${merged[index + 1]}`.length <= MAX_SUBTITLE_SEGMENT_LENGTH
    ) {
      merged[index + 1] = `${merged[index]} ${merged[index + 1]}`;
      merged.splice(index, 1);
      index -= 1;
    }
  }

  return merged.map(rebalanceSegmentLines);
}

export function formatAssTime(seconds: number) {
  const safeSeconds = Math.max(seconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const wholeSeconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 100);

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(
    2,
    "0",
  )}.${String(centiseconds).padStart(2, "0")}`;
}

export function calculateCaptionTimings(
  segments: string[],
  audioDuration: number,
): CaptionTiming[] {
  if (segments.length === 0) {
    return [];
  }

  const cleanLengths = segments.map((segment) => segment.replace(/\\N/g, " ").length);
  const totalWeight = cleanLengths.reduce((sum, length) => sum + Math.max(length, 18), 0);
  const minimumDuration = Math.min(1.35, audioDuration / segments.length);
  const gap = segments.length > 1 ? 0.08 : 0;
  const usableDuration = Math.max(audioDuration - gap * (segments.length - 1), 0.1);
  let cursor = 0;

  return segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const proportionalDuration =
      (usableDuration * Math.max(segment.replace(/\\N/g, " ").length, 18)) / totalWeight;
    const remainingSegments = segments.length - index - 1;
    const maxEndForCurrent = audioDuration - remainingSegments * (minimumDuration + gap);
    const start = Math.min(cursor, audioDuration);
    const end = isLast
      ? audioDuration
      : Math.min(
          Math.max(start + Math.max(proportionalDuration, minimumDuration), start + 0.75),
          maxEndForCurrent,
        );

    cursor = end + gap;

    return {
      start,
      end: Math.min(end, audioDuration),
    };
  });
}

export function createFallbackCaptionCues(text: string, audioDuration: number): CaptionCue[] {
  const segments = mergeOrphanSegments(splitCaptionIntoSegments(text));
  const timings = calculateCaptionTimings(segments, audioDuration);

  return segments.flatMap((segment, index) => {
    const timing = timings[index];

    if (!timing) {
      return [];
    }

    return {
      text: segment,
      start: timing.start,
      end: timing.end,
    };
  });
}

export function createTranscribedCaptionCues(
  transcriptionSegments: TranscriptionSegment[],
  originalCaptionText: string,
  audioDuration: number,
): { cues: CaptionCue[]; quality: CaptionQuality } {
  const whisperWords = flattenWhisperWords(transcriptionSegments);
  const originalWords = originalWordObjectsFromText(originalCaptionText);
  const suspiciousCount = detectSuspiciousWords(
    whisperWords,
    originalWords.map((item) => item.word),
  ).length;

  if (originalWords.length === 0 || transcriptionSegments.length === 0) {
    return {
      cues: [],
      quality: {
        score: 0,
        warning: CAPTION_SYNC_WARNING,
      },
    };
  }

  const cues: CaptionCue[] = [];
  let originalIndex = 0;
  let matchedSegments = 0;
  let totalSegmentScore = 0;

  for (const transcriptionSegment of transcriptionSegments) {
    const segmentWhisperWords = transcriptionSegment.words?.length
      ? transcriptionSegment.words
      : flattenWhisperWords([transcriptionSegment]);
    const targetCount = Math.max(segmentWhisperWords.length, 1);
    const lookaheadEnd = Math.min(originalWords.length, originalIndex + targetCount + 4);
    let bestEnd = Math.min(originalWords.length, originalIndex + targetCount);
    let bestScore = -Infinity;

    for (
      let end = Math.max(originalIndex + 1, originalIndex + targetCount - 2);
      end <= lookaheadEnd;
      end += 1
    ) {
      const candidateWords = originalWords.slice(originalIndex, end);
      const candidateNormalized = candidateWords.map((item) => item.normalized);
      const whisperNormalized = segmentWhisperWords.map((item) =>
        normalizeForAlignment(item.word),
      );
      const pairCount = Math.min(candidateNormalized.length, whisperNormalized.length);
      const similarity =
        pairCount > 0
          ? Array.from({ length: pairCount }, (_, index) =>
              wordSimilarity(candidateNormalized[index] ?? "", whisperNormalized[index] ?? ""),
            ).reduce((sum, score) => sum + score, 0) / pairCount
          : 0;
      const lengthPenalty = Math.abs(candidateNormalized.length - whisperNormalized.length) * 0.08;
      const score = similarity - lengthPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestEnd = end;
      }
    }

    const selectedWords = originalWords.slice(originalIndex, bestEnd).map((item) => item.word);
    originalIndex = bestEnd;

    if (selectedWords.length === 0) {
      continue;
    }

    matchedSegments += 1;
    totalSegmentScore += Math.max(bestScore, 0);
    const segmentText = selectedWords.join(" ");
    const subtitleSegments = mergeOrphanSegments(splitCaptionIntoSegments(segmentText));
    const segmentDuration = Math.max(transcriptionSegment.end - transcriptionSegment.start, 0.1);
    const timings = calculateCaptionTimings(subtitleSegments, segmentDuration);

    for (const [index, subtitleSegment] of subtitleSegments.entries()) {
      const timing = timings[index];

      if (!timing) {
        continue;
      }

      cues.push({
        text: subtitleSegment,
        start: Math.min(transcriptionSegment.start + timing.start, audioDuration),
        end: Math.min(transcriptionSegment.start + timing.end, audioDuration),
      });
    }
  }

  if (originalIndex < originalWords.length && cues.length > 0) {
    const remainingText = originalWords.slice(originalIndex).map((item) => item.word).join(" ");
    const lastCue = cues.at(-1);

    if (
      lastCue &&
      `${lastCue.text.replace(/\\N/g, " ")} ${remainingText}`.length <=
        MAX_SUBTITLE_SEGMENT_LENGTH
    ) {
      lastCue.text = rebalanceSegmentLines(`${lastCue.text.replace(/\\N/g, " ")} ${remainingText}`);
    }
  }

  const finalText = cues.map((cue) => cue.text.replace(/\\N/g, " ")).join(" ");
  const quality = calculateCaptionQualityScore(originalCaptionText, finalText, {
    alignmentRatio: matchedSegments / transcriptionSegments.length,
    suspiciousCount,
  });
  const averageSegmentScore = matchedSegments > 0 ? totalSegmentScore / matchedSegments : 0;

  if (averageSegmentScore < 0.45) {
    quality.warning = CAPTION_SYNC_WARNING;
  }

  return { cues, quality };
}

export function calculateCaptionQualityScore(
  originalText: string,
  finalCaptionText: string,
  details: { alignmentRatio: number; suspiciousCount: number },
): CaptionQuality {
  const originalWords = originalWordsFromText(originalText).map(normalizeForAlignment);
  const finalWords = originalWordsFromText(finalCaptionText).map(normalizeForAlignment);
  const finalSet = new Set(finalWords);
  const matchedWords = originalWords.filter((word) => finalSet.has(word)).length;
  const similarity = originalWords.length > 0 ? matchedWords / originalWords.length : 0;
  const suspiciousPenalty = Math.min(details.suspiciousCount / Math.max(originalWords.length, 1), 0.4);
  const score = Math.max(
    0,
    Math.min(1, similarity * 0.55 + details.alignmentRatio * 0.45 - suspiciousPenalty),
  );

  return {
    score,
    warning: score < 0.72 ? CAPTION_SYNC_WARNING : undefined,
  };
}

export function escapeAssText(text: string) {
  return text
    .replace(/\\(?!N)/g, "")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}
