import { profileShareCopy, profileShareDescription } from "@cinima/shared";
import { socialOgHtml } from "./ogHtml.js";

export function profileShareOgHtml(opts: {
  pageUrl: string;
  handle: string;
  ogImageUrl: string;
}): string {
  const title = profileShareCopy(opts.handle);
  const description = profileShareDescription(opts.handle);

  return socialOgHtml({
    pageTitle: title,
    description,
    url: opts.pageUrl,
    imageUrl: opts.ogImageUrl,
  });
}
