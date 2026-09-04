import {
  titleShareCopy,
  titleShareOgImageUrl,
  type MediaType,
} from "@cinima/shared";

/** Title Share sheet preview - image is the branded Share preview PNG. */
export function titleShareSheetPreview(opts: {
  origin: string;
  handle: string;
  titleName: string;
  mediaType: MediaType;
  tmdbId: number;
  shareUrl: string;
}): {
  url: string;
  headline: string;
  description: string;
  imageUrl: string;
} {
  return {
    url: opts.shareUrl,
    headline: titleShareCopy(opts.handle, opts.titleName),
    description: opts.titleName,
    imageUrl: titleShareOgImageUrl(
      opts.origin,
      opts.handle,
      opts.mediaType,
      opts.tmdbId
    ),
  };
}
