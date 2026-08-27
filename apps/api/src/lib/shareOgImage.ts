import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
  SITE_THEME_COLOR,
} from "@cinima/shared";

export { SHARE_OG_IMAGE_HEIGHT, SHARE_OG_IMAGE_WIDTH };

const BAR_HEIGHT = 88;
const CONTENT_HEIGHT = SHARE_OG_IMAGE_HEIGHT - BAR_HEIGHT;
/** Poster height as a fraction of the content area (above the brand bar). */
export const SHARE_OG_POSTER_HEIGHT_RATIO = 0.8;
const POSTER_TOP_PAD = 40;
const POSTER_SIDE_PAD = 48;
const POSTER_MAX_WIDTH = SHARE_OG_IMAGE_WIDTH - POSTER_SIDE_PAD * 2;
const POSTER_RADIUS = 14;
const GLOW_PAD = 36;
/** Space between poster bottom and title name baseline. */
export const SHARE_OG_TITLE_GAP = 100;
const GOLD = "#E5C158";
const GOLD_HOT = "#ffe9a8";
const MUTED = "#9ca3af";
const WHITE = "#ffffff";
/** App UI font - loaded explicitly via resvg (librsvg ignores Mulish on Alpine). */
const FONT_FAMILY = "Mulish";
const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../assets");
const FONT_DIR = path.join(ASSETS_DIR, "fonts");
const MULISH_REGULAR = path.join(FONT_DIR, "Mulish-Regular.ttf");
const MULISH_BOLD = path.join(FONT_DIR, "Mulish-Bold.ttf");

/** Nimiq outline hex (logos-nimiq-hexagon-outline-mono), viewBox 0 0 18 17. */
const NIMIQ_HEX_PATH =
  "m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z";

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

/** Rasterize SVG text with vendored Mulish (not system fontconfig). */
function renderSvgWithMulish(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [MULISH_REGULAR, MULISH_BOLD],
      loadSystemFonts: false,
      defaultFontFamily: FONT_FAMILY,
    },
  });
  return Buffer.from(resvg.render().asPng());
}

/**
 * Center the poster in the content band with padding on left, top, and right.
 * Bottom stays freer so title copy can sit under the poster.
 */
export function shareOgPosterSlot(
  posterWidth: number,
  posterHeight: number
): { width: number; height: number; left: number; top: number } {
  const aspect =
    posterWidth > 0 && posterHeight > 0 ? posterWidth / posterHeight : 2 / 3;
  let height = Math.round(CONTENT_HEIGHT * SHARE_OG_POSTER_HEIGHT_RATIO);
  let width = Math.round(height * aspect);
  if (width > POSTER_MAX_WIDTH) {
    width = POSTER_MAX_WIDTH;
    height = Math.round(width / aspect);
  }
  const maxHeight = CONTENT_HEIGHT - POSTER_TOP_PAD - SHARE_OG_TITLE_GAP - 80;
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspect);
  }
  return {
    width,
    height,
    left: Math.round((SHARE_OG_IMAGE_WIDTH - width) / 2),
    top: POSTER_TOP_PAD,
  };
}

function hexPatternBackgroundSvg(): Buffer {
  // Same tile as apps/web/src/assets/hex-pattern.svg (pointy-top honeycomb).
  const svg = `<svg width="${SHARE_OG_IMAGE_WIDTH}" height="${SHARE_OG_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="hex" width="84" height="72" patternUnits="userSpaceOnUse">
      <g stroke="${GOLD}" stroke-width="0.9" stroke-linejoin="round" fill="none">
        <path d="M20.785 0 L41.57 12 L41.57 36 L20.785 48 L0 36 L0 12 Z"/>
        <path d="M62.354 0 L83.139 12 L83.139 36 L62.354 48 L41.569 36 L41.569 12 Z"/>
        <path d="M41.569 36 L62.354 48 L62.354 72 L41.569 84 L20.785 72 L20.785 48 Z"/>
        <path d="M41.569 -12 L62.354 0 L41.569 12 L20.785 0 Z"/>
      </g>
    </pattern>
    <radialGradient id="hexFade" cx="50%" cy="32%" r="78%">
      <stop offset="12%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <mask id="hexMask">
      <rect width="100%" height="100%" fill="url(#hexFade)"/>
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${SITE_THEME_COLOR}"/>
  <rect width="100%" height="100%" fill="url(#hex)" opacity="0.14" mask="url(#hexMask)"/>
</svg>`;
  return Buffer.from(svg);
}

/** Soft gold halo + rim like GoldGlowShell (static, no spin). */
async function posterGoldGlowLayer(
  posterWidth: number,
  posterHeight: number
): Promise<Buffer> {
  const w = posterWidth + GLOW_PAD * 2;
  const h = posterHeight + GLOW_PAD * 2;
  const soft = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(
          Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${GLOW_PAD - 2}" y="${GLOW_PAD - 2}" width="${posterWidth + 4}" height="${posterHeight + 4}"
    rx="${POSTER_RADIUS + 2}" fill="${GOLD}" fill-opacity="0.95"/>
</svg>`)
        )
          .png()
          .toBuffer(),
        top: 0,
        left: 0,
      },
    ])
    .blur(22)
    .png()
    .toBuffer();

  // Second wider, softer bloom for GoldGlowShell-like halo.
  const bloom = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp(
          Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${GLOW_PAD + 4}" y="${GLOW_PAD + 4}" width="${posterWidth - 8}" height="${posterHeight - 8}"
    rx="${POSTER_RADIUS}" fill="${GOLD_HOT}" fill-opacity="0.7"/>
</svg>`)
        )
          .png()
          .toBuffer(),
        top: 0,
        left: 0,
      },
    ])
    .blur(28)
    .png()
    .toBuffer();

  const rim = await sharp(
    Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${GLOW_PAD - 3}" y="${GLOW_PAD - 3}" width="${posterWidth + 6}" height="${posterHeight + 6}"
    rx="${POSTER_RADIUS + 2}" fill="none" stroke="${GOLD}" stroke-width="3" opacity="0.95"/>
  <rect x="${GLOW_PAD - 3}" y="${GLOW_PAD - 3}" width="${posterWidth + 6}" height="${posterHeight + 6}"
    rx="${POSTER_RADIUS + 2}" fill="none" stroke="${GOLD_HOT}" stroke-width="1.25" opacity="0.7"/>
</svg>`)
  )
    .png()
    .toBuffer();

  return sharp(bloom)
    .composite([
      { input: soft, top: 0, left: 0 },
      { input: rim, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}

async function roundedPosterPng(
  poster: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const resized = await sharp(poster)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${POSTER_RADIUS}" fill="#ffffff"/>
</svg>`
  );
  return sharp(resized)
    .composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Far-right brand cluster: Nimiq hex + CI/NIM/A wordmark + cinima.app. */
function brandWordmarkSvg(): string {
  const right = SHARE_OG_IMAGE_WIDTH - 36;
  const wordmarkSize = 32;
  const wordmarkY = 38; // baseline for CINIMA
  const urlSize = 22;
  const urlY = wordmarkY + 30;
  // Measured Mulish 32px bold + tracking for "CINIMA".
  const wordmarkWidth = 125;
  const iconSize = 28;
  const gap = 10;
  const iconLeft = right - wordmarkWidth - gap - iconSize;
  // Hex viewBox is 18×17 - scale and optically center on CINIMA caps.
  const scale = iconSize / 18;
  const iconHeight = iconSize * (17 / 18);
  const capHeight = wordmarkSize * 0.7;
  const capTop = wordmarkY - capHeight;
  const iconTop = capTop + (capHeight - iconHeight) / 2 + 1;

  return `<g>
  <g transform="translate(${iconLeft.toFixed(1)}, ${iconTop.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path fill="none" stroke="${GOLD}" stroke-width="1.5" d="${NIMIQ_HEX_PATH}"/>
  </g>
  <text x="${right}" y="${wordmarkY}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${wordmarkSize}" font-weight="700" letter-spacing="0.06em"><tspan fill="${WHITE}">CI</tspan><tspan fill="${GOLD}">NIM</tspan><tspan fill="${WHITE}">A</tspan></text>
  <text x="${right}" y="${urlY}" text-anchor="end" fill="${MUTED}" font-family="${FONT_FAMILY}" font-size="${urlSize}" font-weight="400">cinima.app</text>
</g>`;
}

function brandBarSvg(): Buffer {
  const svg = `<svg width="${SHARE_OG_IMAGE_WIDTH}" height="${BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${SITE_THEME_COLOR}"/>
  ${brandWordmarkSvg()}
</svg>`;
  return renderSvgWithMulish(svg);
}

function overlaySvg(opts: {
  headline?: string;
  subline?: string;
  textY: number;
}): Buffer {
  const headline = opts.headline ? escapeXml(truncate(opts.headline, 42)) : "";
  const subline = opts.subline ? escapeXml(truncate(opts.subline, 48)) : "";
  const cx = SHARE_OG_IMAGE_WIDTH / 2;
  const svg = `<svg width="${SHARE_OG_IMAGE_WIDTH}" height="${SHARE_OG_IMAGE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  ${
    headline
      ? `<text x="${cx}" y="${opts.textY}" text-anchor="middle" fill="#ffffff" font-family="${FONT_FAMILY}" font-size="40" font-weight="700">${headline}</text>`
      : ""
  }
  ${
    subline
      ? `<text x="${cx}" y="${opts.textY + 38}" text-anchor="middle" fill="${MUTED}" font-family="${FONT_FAMILY}" font-size="22" font-weight="400">${subline}</text>`
      : ""
  }
</svg>`;
  return renderSvgWithMulish(svg);
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
  posterBuffer?: Buffer | null;
  headline?: string;
  subline?: string;
}): Promise<Buffer> {
  const poster =
    opts.posterBuffer && opts.posterBuffer.length > 0
      ? opts.posterBuffer
      : await fetchPosterBuffer(opts.posterUrl);

  const canvas = sharp({
    create: {
      width: SHARE_OG_IMAGE_WIDTH,
      height: SHARE_OG_IMAGE_HEIGHT,
      channels: 3,
      background: SITE_THEME_COLOR,
    },
  });

  const layers: { input: Buffer; top: number; left: number }[] = [];

  layers.push({
    input: await sharp(hexPatternBackgroundSvg()).png().toBuffer(),
    top: 0,
    left: 0,
  });

  let textY = Math.round(CONTENT_HEIGHT / 2);

  if (poster) {
    const meta = await sharp(poster).metadata();
    const slot = shareOgPosterSlot(meta.width || 2, meta.height || 3);
    const glow = await posterGoldGlowLayer(slot.width, slot.height);
    const posterLayer = await roundedPosterPng(poster, slot.width, slot.height);
    layers.push({
      input: glow,
      top: Math.max(0, slot.top - GLOW_PAD),
      left: Math.max(0, slot.left - GLOW_PAD),
    });
    layers.push({ input: posterLayer, top: slot.top, left: slot.left });
    textY = slot.top + slot.height + SHARE_OG_TITLE_GAP;
  }

  layers.push({
    input: overlaySvg({
      headline: opts.headline,
      subline: opts.subline,
      textY,
    }),
    top: 0,
    left: 0,
  });
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
  posterBuffer?: Buffer | null;
}): Promise<Buffer> {
  return composeShareOgImage({
    posterUrl: opts.posterUrl,
    posterBuffer: opts.posterBuffer,
    headline: opts.handle,
    subline: "Favorite movies & TV on Cinima",
  });
}

export async function renderTitleShareOgImage(opts: {
  handle: string;
  titleName: string;
  posterUrl?: string | null;
  posterBuffer?: Buffer | null;
}): Promise<Buffer> {
  return composeShareOgImage({
    posterUrl: opts.posterUrl,
    posterBuffer: opts.posterBuffer,
    headline: opts.titleName,
    subline: `${opts.handle} on Cinima`,
  });
}

/** Vendored fonts are installed into the API image for fontconfig / local dev. */
export function shareOgFontFilesPresent(): boolean {
  try {
    return (
      readFileSync(path.join(FONT_DIR, "Mulish-Regular.ttf")).length > 1000 &&
      readFileSync(path.join(FONT_DIR, "Mulish-Bold.ttf")).length > 1000
    );
  } catch {
    return false;
  }
}

export function shareOgImageCacheControl(): string {
  return "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
}
