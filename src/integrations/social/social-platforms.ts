export const socialPlatformLabels = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  YOUTUBE_SHORTS: "YouTube Shorts",
} as const;

export const readySocialPlatforms = ["INSTAGRAM", "TIKTOK", "YOUTUBE"] as const;

export type SupportedPublishPlatform = (typeof readySocialPlatforms)[number];

export function isPublishPlatformReady(platform: string) {
  return readySocialPlatforms.includes(platform as SupportedPublishPlatform);
}
