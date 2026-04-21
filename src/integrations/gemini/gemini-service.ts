import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, Modality } from "@google/genai";
import { z } from "zod";
import { ManusService } from "@/integrations/manus/manus-service";
import { prisma } from "@/lib/prisma";
import { uploadRoot } from "@/lib/paths";
import { saveGeneratedAsset } from "@/lib/storage/local-storage";

const GEMINI_TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;
const GEMINI_IMAGE_MODELS = ["gemini-2.5-flash-image", "gemini-3-pro-image-preview"] as const;
const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const MISSING_KEY_MESSAGE =
  "GEMINI_API_KEY não configurada. Adicione a chave no arquivo .env.";

const reelsPlanSchema = z.object({
  title: z.string().min(1),
  reelsScript: z.string().min(1),
  videoCaption: z.string().min(1),
  postCaption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).default([]),
  sceneIdeas: z.array(z.string().min(1)).default([]),
  imagePrompts: z.array(z.string().min(1)).default([]),
  storyPrompt: z.string().min(1),
});

export type GeminiReelsPlan = z.infer<typeof reelsPlanSchema>;

type GeminiGeneratedAsset = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  prompt?: string;
};

type GeneratedMediaSummary = {
  id: string;
  path: string;
  originalName: string;
  type: "IMAGE" | "AUDIO";
};

export type GeminiTestAssetsResult = {
  plan: GeminiReelsPlan;
  images: GeneratedMediaSummary[];
  audio: GeneratedMediaSummary | null;
  warnings: string[];
};

type InlinePart = {
  inlineData?: {
    data?: string;
    mimeType?: string;
  };
  text?: string;
};

type GeminiResponseWithParts = {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: InlinePart[];
    };
  }>;
};

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(MISSING_KEY_MESSAGE);
  }

  return apiKey;
}

function normalizeGeminiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === MISSING_KEY_MESSAGE) {
    return error;
  }

  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (status === 429 || normalized.includes("quota") || normalized.includes("rate limit")) {
    return new Error("Quota da Gemini excedida. Tente novamente mais tarde ou ajuste o projeto/chave.");
  }

  if (
    status === 500 ||
    status === 503 ||
    normalized.includes("unavailable") ||
    normalized.includes("high demand")
  ) {
    return new Error(
      "A Gemini está temporariamente indisponível ou com alta demanda. Tente novamente em alguns instantes.",
    );
  }

  if (
    status === 401 ||
    status === 403 ||
    normalized.includes("api key") ||
    normalized.includes("apikey") ||
    normalized.includes("permission")
  ) {
    return new Error("Chave da Gemini inválida ou sem permissão. Verifique GEMINI_API_KEY no .env.");
  }

  return new Error(`${fallback}${message ? ` ${message}` : ""}`);
}

function isRetryableGeminiError(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    status === 500 ||
    status === 503 ||
    status === 429 ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("quota") ||
    message.includes("rate limit")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getResponseText(response: GeminiResponseWithParts) {
  const text = response.text?.trim();

  if (text) {
    return text;
  }

  return response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("A resposta da Gemini não retornou um JSON válido.");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function getInlineDataParts(response: GeminiResponseWithParts) {
  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .filter((part) => part.inlineData?.data) ?? []
  );
}

function extensionFromMimeType(mimeType: string, fallback: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  return fallback;
}

function toFormat(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).replace(".", "");
  return extension || mimeType.split("/").at(1)?.split(";").at(0) || "bin";
}

function createWavFromPcm(
  pcmData: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

async function writeStoredPlan(projectId: string, plan: GeminiReelsPlan) {
  const folder = path.join(uploadRoot, projectId);
  await fs.mkdir(folder, { recursive: true });
  await fs.writeFile(path.join(folder, "gemini-plan.json"), JSON.stringify(plan, null, 2), "utf8");
}

export async function readStoredGeminiPlan(projectId: string) {
  try {
    const content = await fs.readFile(path.join(uploadRoot, projectId, "gemini-plan.json"), "utf8");
    return reelsPlanSchema.parse(JSON.parse(content));
  } catch {
    return null;
  }
}

class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: getGeminiApiKey() });
  }

  async generateReelsPlan(prompt: string): Promise<GeminiReelsPlan> {
    let lastError: unknown;

    for (const model of GEMINI_TEXT_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = (await this.getClient().models.generateContent({
            model,
            contents: `Crie materiais para um Reels/TikTok/Shorts em portugues do Brasil a partir deste prompt: "${prompt}".

Retorne somente JSON valido com exatamente estes campos:
{
  "title": string,
  "reelsScript": string,
  "videoCaption": string,
  "postCaption": string,
  "hashtags": string[],
  "sceneIdeas": string[],
  "imagePrompts": string[],
  "storyPrompt": string
}

Regras: roteiro curto para video vertical, legenda objetiva, caption pronta para postagem, 5 a 10 hashtags e 3 a 6 prompts de imagem verticais 9:16.`,
            config: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          })) as GeminiResponseWithParts;

          const text = getResponseText(response);

          if (!text) {
            throw new Error("A Gemini retornou uma resposta vazia.");
          }

          return reelsPlanSchema.parse(parseJsonObject(text));
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw new Error("A resposta da Gemini não veio no formato esperado.");
          }

          lastError = error;

          if (!isRetryableGeminiError(error)) {
            throw normalizeGeminiError(error, "Falha ao gerar o plano com Gemini.");
          }

          if (attempt < 2) {
            await wait(1000 * attempt);
          }
        }
      }
    }

    throw normalizeGeminiError(lastError, "Falha ao gerar o plano com Gemini.");
  }

  async generateSceneImages(imagePrompts: string[]) {
    const assets: GeminiGeneratedAsset[] = [];
    const warnings: string[] = [];

    for (const [index, imagePrompt] of imagePrompts.entries()) {
      let generated = false;

      try {
        for (const model of GEMINI_IMAGE_MODELS) {
          const response = (await this.getClient().models.generateContent({
            model,
            contents: `Gere uma imagem vertical 9:16 para video curto. Nao adicione texto na imagem. Cena: ${imagePrompt}`,
          })) as GeminiResponseWithParts;

          const inlineData = getInlineDataParts(response).at(0)?.inlineData;

          if (!inlineData?.data) {
            continue;
          }

          const mimeType = inlineData.mimeType || "image/png";
          const extension = extensionFromMimeType(mimeType, "png");

          assets.push({
            buffer: Buffer.from(inlineData.data, "base64"),
            fileName: `gemini-scene-${index + 1}.${extension}`,
            mimeType,
            prompt: imagePrompt,
          });
          generated = true;
          break;
        }

        if (!generated) {
          warnings.push(`A Gemini não retornou imagem para a cena ${index + 1}.`);
        }
      } catch (error) {
        const friendly = normalizeGeminiError(error, "Falha ao gerar imagem com Gemini.");
        warnings.push(friendly.message);
      }
    }

    if (assets.length === 0) {
      const manusSettings = await prisma.manusSettings.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      const apiKey = manusSettings?.apiKey || process.env.MANUS_API_KEY;

      if (apiKey) {
        try {
          const manus = new ManusService({
            apiKey,
            modelPreference: manusSettings?.modelPreference || undefined,
            promptPreference: manusSettings?.promptPreference || undefined,
          });
          const manusResult = await manus.generateSceneImages(imagePrompts);

          assets.push(
            ...manusResult.assets.map((asset) => ({
              buffer: asset.buffer,
              fileName: asset.fileName,
              mimeType: asset.mimeType,
              prompt: asset.url,
            })),
          );
          warnings.push(...manusResult.warnings);
        } catch (error) {
          warnings.push(
            error instanceof Error
              ? error.message
              : "A Manus falhou ao tentar gerar imagens.",
          );
        }
      } else {
        warnings.push("MANUS_API_KEY nao configurada. Cadastre a chave em /settings para tentar gerar imagens pela Manus.");
      }
    }

    return { assets, warnings };
  }

  async generateNarrationAudio(script: string) {
    try {
      const response = (await this.getClient().models.generateContent({
        model: GEMINI_TTS_MODEL,
        contents: `Leia em portugues brasileiro, com ritmo natural para Reels, o seguinte roteiro:\n\n${script}`,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            languageCode: "pt-BR",
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore",
              },
            },
          },
        },
      })) as GeminiResponseWithParts;

      const inlineData = getInlineDataParts(response).at(0)?.inlineData;

      if (!inlineData?.data) {
        return {
          asset: null,
          warning: "A Gemini não retornou áudio de narração.",
        };
      }

      const sourceMimeType = inlineData.mimeType || "audio/wav";
      const sourceBuffer = Buffer.from(inlineData.data, "base64");
      const isPcm = sourceMimeType.toLowerCase().includes("pcm") || sourceMimeType.includes("L16");
      const buffer = isPcm ? createWavFromPcm(sourceBuffer) : sourceBuffer;

      return {
        asset: {
          buffer,
          fileName: "gemini-narration.wav",
          mimeType: "audio/wav",
        } satisfies GeminiGeneratedAsset,
        warning: null,
      };
    } catch (error) {
      const friendly = normalizeGeminiError(error, "Falha ao gerar narração com Gemini.");
      return { asset: null, warning: friendly.message };
    }
  }

  async generateTestAssetsForProject(
    projectId: string,
    prompt: string,
    precomputedPlan?: GeminiReelsPlan,
  ): Promise<GeminiTestAssetsResult> {
    const project = await prisma.contentProject.findUnique({
      where: { id: projectId },
      select: { id: true, prompt: true },
    });

    if (!project) {
      throw new Error("Conteúdo não encontrado.");
    }

    const originalPrompt = project.prompt || prompt;
    const plan = precomputedPlan ?? (await this.generateReelsPlan(originalPrompt));
    const warnings: string[] = [];

    await writeStoredPlan(project.id, plan);

    const imageResult = await this.generateSceneImages(plan.imagePrompts.slice(0, 6));
    warnings.push(...imageResult.warnings);

    const audioResult = await this.generateNarrationAudio(plan.reelsScript);

    if (audioResult.warning) {
      warnings.push(audioResult.warning);
    }

    const savedPaths: string[] = [];

    try {
      const imageFiles = await Promise.all(
        imageResult.assets.map((asset) =>
          saveGeneratedAsset(asset.buffer, project.id, asset.fileName, asset.mimeType).then((file) => {
            savedPaths.push(file.path);
            return file;
          }),
        ),
      );
      const audioFile = audioResult.asset
        ? await saveGeneratedAsset(
            audioResult.asset.buffer,
            project.id,
            audioResult.asset.fileName,
            audioResult.asset.mimeType,
          ).then((file) => {
            savedPaths.push(file.path);
            return file;
          })
        : null;

      const mediaRows = [
        ...imageFiles.map((file) => ({
          type: "IMAGE" as const,
          path: file.path,
          originalName: file.fileName,
          size: file.size,
          format: toFormat(file.fileName, file.mimeType),
          mimeType: file.mimeType,
        })),
        ...(audioFile
          ? [
              {
                type: "AUDIO" as const,
                path: audioFile.path,
                originalName: audioFile.fileName,
                size: audioFile.size,
                format: toFormat(audioFile.fileName, audioFile.mimeType),
                mimeType: audioFile.mimeType,
              },
            ]
          : []),
      ];

      await prisma.$transaction(async (tx) => {
        await tx.contentProject.update({
          where: { id: project.id },
          data: {
            title: plan.title,
            caption: plan.videoCaption,
            prompt: originalPrompt,
          },
        });

        if (mediaRows.length > 0) {
          await tx.mediaFile.createMany({
            data: mediaRows.map((row) => ({
              ...row,
              projectId: project.id,
            })),
          });
        }
      });

      const createdMedia = await prisma.mediaFile.findMany({
        where: {
          projectId: project.id,
          path: {
            in: mediaRows.map((row) => row.path),
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const audioMedia = createdMedia.find((media) => media.type === "AUDIO");

      return {
        plan,
        images: createdMedia
          .filter((media) => media.type === "IMAGE")
          .map((media) => ({
            id: media.id,
            path: media.path,
            originalName: media.originalName,
            type: "IMAGE",
          })),
        audio: audioMedia
          ? {
              id: audioMedia.id,
              path: audioMedia.path,
              originalName: audioMedia.originalName,
              type: "AUDIO",
            }
          : null,
        warnings,
      };
    } catch (error) {
      await Promise.all(savedPaths.map((filePath) => fs.rm(filePath, { force: true })));
      throw normalizeGeminiError(error, "Falha ao salvar os assets gerados.");
    }
  }
}

export const geminiService = new GeminiService();
