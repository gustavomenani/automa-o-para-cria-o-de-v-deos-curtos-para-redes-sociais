import type { ContentProject, GeneratedVideo, MediaFile } from "@prisma/client";

export type ContentProjectWithRelations = ContentProject & {
  mediaFiles: MediaFile[];
  generatedVideos: GeneratedVideo[];
};
