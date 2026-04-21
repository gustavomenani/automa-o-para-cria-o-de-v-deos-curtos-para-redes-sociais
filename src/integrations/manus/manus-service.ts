export type ManusTaskStatus = "queued" | "running" | "completed" | "failed";

export type ManusTask = {
  id: string;
  prompt: string;
  status: ManusTaskStatus;
  createdAt: string;
};

export type ManusTaskMessage = {
  id: string;
  taskId: string;
  role: "system" | "assistant" | "user";
  content: string;
  createdAt: string;
};

export type ManusGeneratedFile = {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  url: string;
};

export type ManusGeneratedImageAsset = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  url: string;
};

export type ManusServiceConfig = {
  apiKey?: string;
  modelPreference?: string;
  promptPreference?: string;
};

type ManusAttachment = {
  type?: string;
  filename?: string;
  url?: string;
  content_type?: string;
};

type ManusTaskMessageResponse = {
  ok?: boolean;
  task_id?: string;
  messages?: Array<{
    id?: string;
    type?: string;
    timestamp?: number;
    assistant_message?: {
      content?: string;
      attachments?: ManusAttachment[];
    };
    user_message?: {
      content?: string;
      attachments?: ManusAttachment[];
    };
    error_message?: {
      error_type?: string;
      content?: string;
    };
    status_update?: {
      agent_status?: "running" | "stopped" | "waiting" | "error";
      brief?: string;
      description?: string;
    };
  }>;
};

type ManusCreateTaskResponse = {
  ok?: boolean;
  task_id?: string;
  task_title?: string;
  task_url?: string;
};

function createMockId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`;
}

export class ManusService {
  constructor(private readonly config: ManusServiceConfig = {}) {}

  private get apiKey() {
    return this.config.apiKey || process.env.MANUS_API_KEY || "";
  }

  private ensureApiKey() {
    if (!this.apiKey) {
      throw new Error("MANUS_API_KEY nao configurada. Cadastre a chave em /settings ou no arquivo .env.");
    }

    return this.apiKey;
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await fetch(`https://api.manus.ai/v2/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-manus-api-key": this.ensureApiKey(),
        ...init.headers,
      },
    });

    const body = (await response.json().catch(() => null)) as T | { error?: unknown } | null;

    if (!response.ok) {
      throw new Error(
        `Falha na API da Manus (${response.status}). ${body ? JSON.stringify(body) : ""}`.trim(),
      );
    }

    return body as T;
  }

  async createTask(prompt: string): Promise<ManusTask> {
    if (this.apiKey) {
      const response = await this.request<ManusCreateTaskResponse>("task.create", {
        method: "POST",
        body: JSON.stringify({
          message: {
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
          locale: "pt-BR",
          interactive_mode: false,
          hide_in_task_list: true,
          agent_profile: this.config.modelPreference || "manus-1.6",
        }),
      });

      return {
        id: response.task_id || createMockId("manus_task"),
        prompt,
        status: "queued",
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: createMockId("manus_task"),
      prompt,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }

  async getTaskStatus(taskId: string): Promise<{ taskId: string; status: ManusTaskStatus }> {
    if (this.apiKey) {
      const response = await this.listRawTaskMessages(taskId);
      const latestStatus = response.messages
        ?.map((message) => message.status_update?.agent_status)
        .find(Boolean);

      if (latestStatus === "stopped") return { taskId, status: "completed" };
      if (latestStatus === "error") return { taskId, status: "failed" };
      if (latestStatus === "running" || latestStatus === "waiting") return { taskId, status: "running" };
    }

    return {
      taskId,
      status: this.config.apiKey ? "running" : "queued",
    };
  }

  async listTaskMessages(taskId: string): Promise<ManusTaskMessage[]> {
    if (this.apiKey) {
      const response = await this.listRawTaskMessages(taskId);

      return (response.messages ?? []).map((message) => ({
        id: message.id || createMockId("msg"),
        taskId,
        role: message.type === "user_message" ? "user" : "assistant",
        content:
          message.assistant_message?.content ||
          message.user_message?.content ||
          message.error_message?.content ||
          message.status_update?.brief ||
          "",
        createdAt: message.timestamp
          ? new Date(message.timestamp * 1000).toISOString()
          : new Date().toISOString(),
      }));
    }

    return [
      {
        id: createMockId("msg"),
        taskId,
        role: "system",
        content: "Mock Manus task initialized. Replace ManusService internals with the real API client later.",
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async downloadGeneratedFiles(taskId: string): Promise<ManusGeneratedFile[]> {
    if (this.apiKey) {
      const response = await this.listRawTaskMessages(taskId);
      const attachments = this.getAssistantAttachments(response);

      return attachments.map((attachment, index) => ({
        id: createMockId("file"),
        taskId,
        fileName: attachment.filename || `manus-file-${index + 1}`,
        mimeType: attachment.content_type || "application/octet-stream",
        url: attachment.url || "",
      }));
    }

    return [
      {
        id: createMockId("file"),
        taskId,
        fileName: "mock-generated-script.txt",
        mimeType: "text/plain",
        url: "mock://manus/generated/mock-generated-script.txt",
      },
    ];
  }

  async generateSceneImages(
    imagePrompts: string[],
    options: { maxWaitMs?: number } = {},
  ): Promise<{ assets: ManusGeneratedImageAsset[]; warnings: string[] }> {
    const prompt = `Gere ${imagePrompts.length} imagens verticais 9:16 para um video curto de redes sociais.

Regras obrigatorias:
- entregar cada imagem como anexo de imagem, preferencialmente PNG ou WEBP;
- nao inserir textos, marcas d'agua, logos ou legendas nas imagens;
- usar composicao vertical, pronta para Reels/TikTok/Shorts;
- criar uma imagem para cada cena abaixo.

Cenas:
${imagePrompts.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;

    const task = await this.createTask(prompt);
    const startedAt = Date.now();
    const maxWaitMs = options.maxWaitMs ?? 90_000;
    let lastMessages: ManusTaskMessageResponse | null = null;

    while (Date.now() - startedAt < maxWaitMs) {
      lastMessages = await this.listRawTaskMessages(task.id);
      const attachments = this.getAssistantAttachments(lastMessages).filter((attachment) =>
        attachment.type === "image" || attachment.content_type?.startsWith("image/"),
      );

      if (attachments.length > 0) {
        const images = await Promise.all(
          attachments.slice(0, imagePrompts.length).map((attachment, index) =>
            this.downloadImageAttachment(attachment, index),
          ),
        );

        return {
          assets: images.filter((image): image is ManusGeneratedImageAsset => image !== null),
          warnings: [] as string[],
        };
      }

      const status = lastMessages.messages
        ?.map((message) => message.status_update?.agent_status)
        .find(Boolean);

      if (status === "error") {
        const errorMessage = lastMessages.messages
          ?.map((message) => message.error_message?.content)
          .find(Boolean);
        return {
          assets: [],
          warnings: [errorMessage || "A task da Manus terminou com erro ao gerar imagens."],
        };
      }

      if (status === "stopped") {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    return {
      assets: [] as ManusGeneratedImageAsset[],
      warnings: ["A Manus nao retornou imagens dentro do tempo limite."],
    };
  }

  private async listRawTaskMessages(taskId: string) {
    const query = new URLSearchParams({
      task_id: taskId,
      order: "desc",
      limit: "50",
      verbose: "true",
    });

    return this.request<ManusTaskMessageResponse>(`task.listMessages?${query.toString()}`, {
      method: "GET",
    });
  }

  private getAssistantAttachments(response: ManusTaskMessageResponse) {
    return (
      response.messages
        ?.flatMap((message) => message.assistant_message?.attachments ?? [])
        .filter((attachment) => attachment.url) ?? []
    );
  }

  private async downloadImageAttachment(
    attachment: ManusAttachment,
    index: number,
  ): Promise<ManusGeneratedImageAsset | null> {
    if (!attachment.url) {
      return null;
    }

    const response = await fetch(attachment.url, {
      headers: {
        "x-manus-api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const mimeType = attachment.content_type || response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") ? "jpg" : "png";

    return {
      buffer,
      fileName: attachment.filename || `manus-scene-${index + 1}.${extension}`,
      mimeType,
      url: attachment.url,
    };
  }
}

export const manusService = new ManusService();
