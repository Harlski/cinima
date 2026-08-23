import { profileShareCopy, profileShareDescription } from "@cinima/shared";
import { socialOgHtml } from "./ogHtml.js";

export function profileShareOgHtml(opts: {
  pageUrl: string;
  handle: string;
  recommendCount: number;
  favoriteCount: number;
  imageUrl: string | null;
}): string {
  const title = profileShareCopy(opts.handle);
  const description = profileShareDescription(opts.recommendCount, opts.favoriteCount);

  return socialOgHtml({
    pageTitle: title,
    description,
    url: opts.pageUrl,
    imageUrl: opts.imageUrl,
  });
}
