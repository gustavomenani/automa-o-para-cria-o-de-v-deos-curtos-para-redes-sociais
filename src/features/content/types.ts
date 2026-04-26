import type { ContentProject, GeneratedVideo, MediaFile, AssetGenerationRun } from "@prisma/client";

export type ContentProjectWithRelations = ContentProject & {
  mediaFiles: MediaFile[];
  generatedVideos: GeneratedVideo[];
  assetGenerationRuns?: AssetGenerationRun[];
};
