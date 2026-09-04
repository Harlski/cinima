import {
  watchlistShareCopy,
  watchlistShareDescription,
  watchlistShareOgImageUrl,
} from "@cinima/shared";

/** My List Share sheet preview - image is the branded Watchlist Share PNG. */
export function watchlistShareSheetPreview(opts: {
  origin: string;
  handle: string;
  shareUrl: string;
}): {
  url: string;
  headline: string;
  description: string;
  imageUrl: string;
} {
  return {
    url: opts.shareUrl,
    headline: watchlistShareCopy(opts.handle),
    description: watchlistShareDescription(opts.handle),
    imageUrl: watchlistShareOgImageUrl(opts.origin, opts.handle),
  };
}
