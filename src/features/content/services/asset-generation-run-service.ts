import { prisma } from "@/lib/prisma";
import type { AssetProvider, AssetGenerationStatus, Prisma } from "@prisma/client";

/**
 * Redacts sensitive values from logs/summaries before persistence.
 */
export function sanitizeRunSummary(summary: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (!summary) return summary;
  
  let jsonString = typeof summary === "string" ? summary : JSON.stringify(summary);
  
  // Redact API Keys
  jsonString = jsonString.replace(/(MANUS_API_KEY|GEMINI_API_KEY|apiKey)["':\s]+([^"'\s,}]+)/gi, '$1": "[REDACTED]"');
  jsonString = jsonString.replace(/sk-[a-zA-Z0-9]{32,}/g, "sk-[REDACTED]");
  jsonString = jsonString.replace(/AIza[0-9A-Za-z-_]{35}/g, "AIza[REDACTED]");
  
  // Redact local paths
  jsonString = jsonString.replace(/[a-zA-Z]:\\[^\s"']+/g, "[LOCAL_PATH_REDACTED]");
  jsonString = jsonString.replace(/\/(home|Users|storage)\/[^\s"']+/g, "[LOCAL_PATH_REDACTED]");
  
  // Redact stack traces
  jsonString = jsonString.replace(/at\s+.*\(.*:[0-9]+:[0-9]+\)/g, "[STACK_TRACE_REDACTED]");
  
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString; // If it wasn't JSON, return the redacted string
  }
}

export async function startAssetGenerationRun(params: {
  projectId: string;
  provider: AssetProvider;
  providerTaskId?: string;
}) {
  return prisma.assetGenerationRun.create({
    data: {
      projectId: params.projectId,
      provider: params.provider,
      providerTaskId: params.providerTaskId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function updateAssetGenerationRun(params: {
  runId: string;
  providerTaskId?: string;
  status?: AssetGenerationStatus;
  summary?: Prisma.InputJsonValue;
  missingAssets?: Prisma.InputJsonValue;
  finishedAt?: Date;
}) {
  const data: Prisma.AssetGenerationRunUpdateInput = {};
  
  if (params.providerTaskId !== undefined) data.providerTaskId = params.providerTaskId;
  if (params.status) data.status = params.status;
  if (params.summary !== undefined) data.summary = sanitizeRunSummary(params.summary);
  if (params.missingAssets !== undefined) data.missingAssets = params.missingAssets;
  if (params.finishedAt !== undefined) data.finishedAt = params.finishedAt;

  return prisma.assetGenerationRun.update({
    where: { id: params.runId },
    data,
  });
}

export async function failAssetGenerationRun(params: {
  runId: string;
  summary?: Prisma.InputJsonValue;
  missingAssets?: Prisma.InputJsonValue;
}) {
  return updateAssetGenerationRun({
    ...params,
    status: "FAILED",
    finishedAt: new Date(),
  });
}

export async function completeAssetGenerationRun(params: {
  runId: string;
  summary?: Prisma.InputJsonValue;
  missingAssets?: Prisma.InputJsonValue;
  status: AssetGenerationStatus; // To handle COMPLETED, PARTIAL or MANUAL_ACTION_REQUIRED etc.
}) {
  return updateAssetGenerationRun({
    ...params,
    finishedAt: new Date(),
  });
}
