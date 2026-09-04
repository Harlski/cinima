import { watchlistShareCopy, watchlistShareDescription } from "@cinima/shared";
import { socialOgHtml } from "./ogHtml.js";

export function watchlistShareOgHtml(opts: {
  pageUrl: string;
  handle: string;
  ogImageUrl: string;
}): string {
  return socialOgHtml({
    pageTitle: watchlistShareCopy(opts.handle),
    description: watchlistShareDescription(opts.handle),
    url: opts.pageUrl,
    imageUrl: opts.ogImageUrl,
  });
}
