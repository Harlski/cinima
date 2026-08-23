import {
  SITE_LOCALE,
  SITE_NAME,
  SITE_THEME_COLOR,
} from "@cinima/shared";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function socialOgHtml(opts: {
  pageTitle: string;
  description: string;
  url: string;
  imageUrl?: string | null;
}): string {
  const title = escapeHtml(opts.pageTitle);
  const desc = escapeHtml(opts.description);
  const url = escapeHtml(opts.url);
  const image = opts.imageUrl ? escapeHtml(opts.imageUrl) : "";
  const siteName = escapeHtml(SITE_NAME);
  const faviconUrl = escapeHtml(new URL("/favicon.svg", opts.url).href);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="robots" content="index, follow" />
  <link rel="icon" href="${faviconUrl}" type="image/svg+xml" />
  <link rel="canonical" href="${url}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="${SITE_LOCALE}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  ${image ? `<meta property="og:image" content="${image}" />` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ""}
  <meta name="theme-color" content="${SITE_THEME_COLOR}" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body>
  <p><a href="${url}">${title}</a></p>
</body>
</html>
`;
}
