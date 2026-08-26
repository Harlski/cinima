import { titleShareCopy } from "@cinima/shared";
import { socialOgHtml } from "./ogHtml.js";

export function titleShareOgHtml(opts: {
  pageUrl: string;
  handle: string;
  titleName: string;
  ogImageUrl: string;
}): string {
  const invitation = titleShareCopy(opts.handle, opts.titleName);

  return socialOgHtml({
    pageTitle: invitation,
    description: invitation,
    url: opts.pageUrl,
    imageUrl: opts.ogImageUrl,
  });
}
