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

export type ManusServiceConfig = {
  apiKey?: string;
  modelPreference?: string;
  promptPreference?: string;
};

function createMockId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}`;
}

export class ManusService {
  constructor(private readonly config: ManusServiceConfig = {}) {}

  async createTask(prompt: string): Promise<ManusTask> {
    return {
      id: createMockId("manus_task"),
      prompt,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
  }

  async getTaskStatus(taskId: string): Promise<{ taskId: string; status: ManusTaskStatus }> {
    return {
      taskId,
      status: this.config.apiKey ? "running" : "queued",
    };
  }

  async listTaskMessages(taskId: string): Promise<ManusTaskMessage[]> {
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
}

export const manusService = new ManusService();
