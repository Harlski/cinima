import {
  profileShareCopy,
  profileShareDescription,
  profileShareOgImageUrl,
} from "@cinima/shared";

/** Me Share profile sheet preview - image is the branded Share preview PNG. */
export function profileShareSheetPreview(opts: {
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
    headline: profileShareCopy(opts.handle),
    description: profileShareDescription(opts.handle),
    imageUrl: profileShareOgImageUrl(opts.origin, opts.handle),
  };
}
