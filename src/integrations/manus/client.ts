export type ManusContentRequest = {
  prompt: string;
  assets: string[];
};

export interface ManusClient {
  createContent(request: ManusContentRequest): Promise<never>;
}

export class ManusIntegrationNotConfiguredError extends Error {
  constructor() {
    super("Manus integration is not implemented in the MVP.");
  }
}

export const manusClient: ManusClient = {
  async createContent() {
    throw new ManusIntegrationNotConfiguredError();
  },
};
