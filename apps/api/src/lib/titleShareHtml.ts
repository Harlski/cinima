import {
  titleShareCopy,
  titleShareUrl,
  type MediaType,
} from "@cinima/shared";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function titleShareOgHtml(opts: {
  origin: string;
  handle: string;
  mediaType: MediaType;
  tmdbId: number;
  titleName: string;
  posterUrl: string | null;
}): string {
  const pageUrl = titleShareUrl(opts.origin, opts.handle, opts.mediaType, opts.tmdbId);
  const invitation = titleShareCopy(opts.handle, opts.titleName);
  const title = escapeHtml(invitation);
  const desc = title;
  const url = escapeHtml(pageUrl);
  const image = opts.posterUrl ? escapeHtml(opts.posterUrl) : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ""}
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p><a href="${url}">${title}</a></p>
</body>
</html>
`;
}
