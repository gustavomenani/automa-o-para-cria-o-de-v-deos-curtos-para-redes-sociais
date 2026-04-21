import { z } from "zod";

export const contentProjectInputSchema = z.object({
  title: z.string().trim().min(2, "Informe um titulo."),
  prompt: z.string().trim().min(1, "Informe um prompt."),
  caption: z.string().trim().optional(),
  contentType: z
    .enum(["REELS", "STORY", "TIKTOK", "YOUTUBE_SHORTS"])
    .default("REELS"),
});

export type ContentProjectInput = z.infer<typeof contentProjectInputSchema>;
