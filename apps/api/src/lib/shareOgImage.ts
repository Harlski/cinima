import sharp from "sharp";
import { SITE_THEME_COLOR } from "@cinima/shared";

export const SHARE_OG_IMAGE_WIDTH = 1200;
export const SHARE_OG_IMAGE_HEIGHT = 630;
const BAR_HEIGHT = 88;
const GOLD = "#E5C158";
const MUTED = "#9ca3af";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function brandBarSvg(): Buffer {
  const svg = `<svg width="${SHARE_OG_IMAGE_WIDTH}" height="${BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${SITE_THEME_COLOR}"/>
  <g transform="translate(36, 24)">
    <rect width="40" height="40" rx="9" fill="${SITE_THEME_COLOR}"/>
    <path fill="none" stroke="${GOLD}" stroke-width="1.8"
      d="m33.8 18.9-3.8-6.8a1.52 1.52 0 0 0-1.32-.88H8.2c-.54 0-1.04.3-1.32.78L3.1 18.9a1.6 1.6 0 0 0 0 1.57l3.8 6.78c.27.49.78.78 1.32.78h7.6c.54 0 1.04-.29 1.32-.78l3.8-6.78a1.6 1.6 0 0 0 0-1.57Z"
      transform="translate(2, 2) scale(1.05)"/>
  </g>
  <text x="92" y="52" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700">Cinima</text>
  <text x="92" y="74" fill="${MUTED}" font-family="Arial, Helvetica, sans-serif" font-size="17">cinima.app</text>
</svg>`;
  return Buffer.from(svg);
}

function overlaySvg(opts: { headline?: string; subline?: string }): Buffer {
  const headline = opts.headline ? escapeXml(truncate(opts.headline, 48)) : "";
  const subline = opts.subline ? escapeXml(truncate(opts.subline, 72)) : "";
  const svg = `<svg width="${SHARE_OG_IMAGE_WIDTH}" height="${SHARE_OG_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="55%" stop-color="${SITE_THEME_COLOR}" stop-opacity="0"/>
      <stop offset="100%" stop-color="${SITE_THEME_COLOR}" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#shade)"/>
  ${
    headline
      ? `<text x="48" y="${SHARE_OG_IMAGE_HEIGHT - BAR_HEIGHT - 72}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700">${headline}</text>`
      : ""
  }
  ${
    subline
      ? `<text x="48" y="${SHARE_OG_IMAGE_HEIGHT - BAR_HEIGHT - 24}" fill="${MUTED}" font-family="Arial, Helvetica, sans-serif" font-size="24">${subline}</text>`
      : ""
  }
</svg>`;
  return Buffer.from(svg);
}

async function fetchPosterBuffer(posterUrl: string | null | undefined): Promise<Buffer | null> {
  if (!posterUrl) return null;
  try {
    const res = await fetch(posterUrl, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "CinimaSharePreview/1.0" },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

async function composeShareOgImage(opts: {
  posterUrl?: string | null;
  headline?: string;
  subline?: string;
}): Promise<Buffer> {
  const poster = await fetchPosterBuffer(opts.posterUrl);
  const canvas = sharp({
    create: {
      width: SHARE_OG_IMAGE_WIDTH,
      height: SHARE_OG_IMAGE_HEIGHT,
      channels: 3,
      background: SITE_THEME_COLOR,
    },
  });

  const layers: { input: Buffer; top: number; left: number }[] = [];

  if (poster) {
    const posterLayer = await sharp(poster)
      .resize(SHARE_OG_IMAGE_WIDTH, SHARE_OG_IMAGE_HEIGHT - BAR_HEIGHT, {
        fit: "cover",
        position: "centre",
      })
      .png()
      .toBuffer();
    layers.push({ input: posterLayer, top: 0, left: 0 });
  }

  layers.push({ input: overlaySvg(opts), top: 0, left: 0 });
  layers.push({
    input: brandBarSvg(),
    top: SHARE_OG_IMAGE_HEIGHT - BAR_HEIGHT,
    left: 0,
  });

  return canvas.composite(layers).png().toBuffer();
}

export async function renderProfileShareOgImage(opts: {
  handle: string;
  posterUrl?: string | null;
}): Promise<Buffer> {
  return composeShareOgImage({
    posterUrl: opts.posterUrl,
    headline: opts.handle,
    subline: "Favorite movies & TV on Cinima",
  });
}

export async function renderTitleShareOgImage(opts: {
  handle: string;
  titleName: string;
  posterUrl?: string | null;
}): Promise<Buffer> {
  return composeShareOgImage({
    posterUrl: opts.posterUrl,
    headline: opts.titleName,
    subline: `${opts.handle} on Cinima`,
  });
}

export function shareOgImageCacheControl(): string {
  return "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
}
