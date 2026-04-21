export type SocialPlatform = "instagram" | "tiktok" | "youtube";

export type PublishRequest = {
  platform: SocialPlatform;
  contentId: string;
  videoPath: string;
  caption: string;
  scheduledFor?: Date;
};

export interface SocialPublisher {
  schedule(request: PublishRequest): Promise<never>;
  publishNow(request: PublishRequest): Promise<never>;
}

export class SocialPublishingNotConfiguredError extends Error {
  constructor() {
    super("Social publishing is intentionally stubbed in the MVP.");
  }
}

export const socialPublisher: SocialPublisher = {
  async schedule() {
    throw new SocialPublishingNotConfiguredError();
  },
  async publishNow() {
    throw new SocialPublishingNotConfiguredError();
  },
};
