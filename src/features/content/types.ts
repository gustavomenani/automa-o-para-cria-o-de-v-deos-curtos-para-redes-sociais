import type { Asset, Content } from "@prisma/client";

export type ContentWithAssets = Content & {
  assets: Asset[];
};
