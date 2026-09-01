/**
 * Compose the X/Twitter pinned tweet image.
 *
 * Hex honeycomb background matches Share preview cards. A bottom-aligned
 * title-card shelf scales up toward the center; the larger center cards
 * carry the gold Recommend hex.
 *
 * Writes X pinned sizes plus GitHub social preview (1280x640).
 *
 * pnpm --filter @cinima/web compose:x-pinned-card
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type ResvgCtor = new (
  svg: string,
  options: {
    font: {
      fontFiles: string[];
      loadSystemFonts: boolean;
      defaultFontFamily: string;
    };
  }
) => { render: () => { asPng: () => Uint8Array } };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPO = path.resolve(ROOT, "../..");
const OUT_DIR = path.join(ROOT, "public/social");
const FONT_DIR = path.join(REPO, "apps/api/assets/fonts");
const MULISH_REGULAR = path.join(FONT_DIR, "Mulish-Regular.ttf");
const MULISH_BOLD = path.join(FONT_DIR, "Mulish-Bold.ttf");
const POSTER_CACHE_DIR = "/tmp/cinima-header/pinned-posters";

const requireFromApi = createRequire(path.join(REPO, "apps/api/package.json"));
const { Resvg } = requireFromApi("@resvg/resvg-js") as { Resvg: ResvgCtor };

const BG = "#1c1f33";
const GOLD = "#E5C158";
const GOLD_HOT = "#ffe9a8";
const MUTED = "#9ca3af";
const WHITE = "#ffffff";
const FONT_FAMILY = "Mulish";

const POSTER_RADIUS = 12;
const GLOW_PAD = 36;
const CARD_GAP = 16;
const ASPECT = 2 / 3;

type CanvasSpec = {
  width: number;
  height: number;
  maxCardH: number;
  bottomPad: number;
  firstY: number;
  filename: string;
  /** Type size relative to the 1600px X card. */
  typeScale?: number;
};

const CANVASES: readonly CanvasSpec[] = [
  {
    width: 1600,
    height: 900,
    maxCardH: 408,
    bottomPad: 40,
    firstY: 92,
    filename: "x-pinned-card.png",
  },
  {
    width: 1600,
    height: 984,
    maxCardH: 420,
    bottomPad: 48,
    firstY: 108,
    filename: "x-pinned-card-1600x984.png",
  },
  {
    width: 1280,
    height: 640,
    maxCardH: 300,
    bottomPad: 28,
    firstY: 68,
    filename: "github-social.png",
    typeScale: 0.8,
  },
];

/** Nimiq hex (logos-nimiq-hexagon-outline-mono), viewBox 0 0 18 17. */
const NIMIQ_HEX_PATH =
  "m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z";

const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";

/** Outer cards smaller; center three larger + Recommend hex. */
const SHELF: readonly {
  posterPath: string;
  scale: number;
  recommended: boolean;
}[] = [
  { posterPath: "/74xTEgt7R36Fpooo50r9T25onhq.jpg", scale: 0.5, recommended: false }, // The Batman
  { posterPath: "/n0YuM4f5lvGAP6MAW2kBIzugXnc.jpg", scale: 0.66, recommended: false }, // Top Gun: Maverick
  { posterPath: "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg", scale: 0.86, recommended: true }, // Oppenheimer
  { posterPath: "/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg", scale: 1, recommended: true }, // Spider-Man: NWH
  { posterPath: "/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg", scale: 0.86, recommended: true }, // Arcane
  { posterPath: "/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg", scale: 0.66, recommended: false }, // The Last of Us
  { posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", scale: 0.5, recommended: false }, // Interstellar
];

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

function hexPatternBackgroundSvg(width: number, height: number): Buffer {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="hex" width="84" height="72" patternUnits="userSpaceOnUse">
      <g stroke="${GOLD}" stroke-width="0.9" stroke-linejoin="round" fill="none">
        <path d="M20.785 0 L41.57 12 L41.57 36 L20.785 48 L0 36 L0 12 Z"/>
        <path d="M62.354 0 L83.139 12 L83.139 36 L62.354 48 L41.569 36 L41.569 12 Z"/>
        <path d="M41.569 36 L62.354 48 L62.354 72 L41.569 84 L20.785 72 L20.785 48 Z"/>
        <path d="M41.569 -12 L62.354 0 L41.569 12 L20.785 0 Z"/>
      </g>
    </pattern>
    <radialGradient id="hexFade" cx="50%" cy="28%" r="78%">
      <stop offset="12%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <mask id="hexMask">
      <rect width="100%" height="100%" fill="url(#hexFade)"/>
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect width="100%" height="100%" fill="url(#hex)" opacity="0.14" mask="url(#hexMask)"/>
</svg>`;
  return Buffer.from(svg);
}

function ensurePosterLocal(posterPath: string): string {
  fs.mkdirSync(POSTER_CACHE_DIR, { recursive: true });
  const out = path.join(POSTER_CACHE_DIR, path.basename(posterPath));
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) return out;

  const url = `${TMDB_IMG_BASE}${posterPath.startsWith("/") ? "" : "/"}${posterPath}`;
  execSync(`curl -fsSL -A "Mozilla/5.0" "${url}" -o "${out}"`, { stdio: "ignore" });
  return out;
}

async function roundedPosterPng(
  poster: Buffer,
  width: number,
  height: number
): Promise<Buffer> {
  const resized = await sharp(poster)
    .resize(width, height, { fit: "cover", position: "centre" })
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

async function posterGoldGlowLayer(posterWidth: number, posterHeight: number): Promise<Buffer> {
  const w = posterWidth + GLOW_PAD * 2;
  const h = posterHeight + GLOW_PAD * 2;
  const soft = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
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

  const bloom = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
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

function recommendBadgeSvg(size: number): Buffer {
  const h = Math.round((size * 17) / 18);
  const pad = Math.ceil(size * 0.18);
  const w = size + pad * 2;
  const bh = h + pad * 2;
  const scale = size / 18;
  const svg = `<svg width="${w}" height="${bh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="badgeShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity="0.75"/>
    </filter>
  </defs>
  <g filter="url(#badgeShadow)" transform="translate(${pad}, ${pad}) scale(${scale.toFixed(4)})">
    <path d="${NIMIQ_HEX_PATH}" fill="${GOLD}" stroke="#0a0a0f" stroke-width="1.35"
      stroke-linejoin="round" paint-order="stroke fill"/>
  </g>
</svg>`;
  return Buffer.from(svg);
}

function overlayCopySvg(opts: {
  width: number;
  height: number;
  textLeft: number;
  textRight: number;
  firstY: number;
  typeScale: number;
}): Buffer {
  const { width, height, textLeft, textRight, firstY, typeScale } = opts;
  const lineSize = Math.round(58 * typeScale);
  const lineGap = Math.round(12 * typeScale);
  const lines = [
    { prefix: "Your ", rest: "Watchlist", restFill: WHITE },
    { prefix: "Your ", rest: "Favorites", restFill: WHITE },
    { prefix: "Your ", rest: "Recommendations", restFill: GOLD },
  ];

  const lineEls = lines
    .map((line, i) => {
      const y = firstY + i * (lineSize + lineGap);
      return `<text x="${textLeft}" y="${y}" font-family="${FONT_FAMILY}" font-size="${lineSize}" font-weight="700" letter-spacing="-0.02em"><tspan fill="${MUTED}">${line.prefix}</tspan><tspan fill="${line.restFill}">${line.rest}</tspan></text>`;
    })
    .join("\n  ");

  const wordmarkSize = Math.round(48 * typeScale);
  const urlSize = Math.round(24 * typeScale);
  const wordmarkWidth = Math.round(188 * typeScale);
  const iconSize = Math.round(42 * typeScale);
  const gap = Math.round(14 * typeScale);
  const iconLeft = textRight - wordmarkWidth - gap - iconSize;
  const scale = iconSize / 18;
  const iconHeight = iconSize * (17 / 18);
  const wordmarkY = firstY;
  const capHeight = wordmarkSize * 0.7;
  const capTop = wordmarkY - capHeight;
  const iconTop = capTop + (capHeight - iconHeight) / 2 + 1;
  const urlY = wordmarkY + Math.round(36 * typeScale);

  const brand = `<g>
  <g transform="translate(${iconLeft.toFixed(1)}, ${iconTop.toFixed(1)}) scale(${scale.toFixed(4)})">
    <path fill="none" stroke="${GOLD}" stroke-width="1.5" d="${NIMIQ_HEX_PATH}"/>
  </g>
  <text x="${textRight}" y="${wordmarkY}" text-anchor="end" font-family="${FONT_FAMILY}" font-size="${wordmarkSize}" font-weight="700" letter-spacing="0.06em"><tspan fill="${WHITE}">CI</tspan><tspan fill="${GOLD}">NIM</tspan><tspan fill="${WHITE}">A</tspan></text>
  <text x="${textRight}" y="${urlY}" text-anchor="end" fill="${MUTED}" font-family="${FONT_FAMILY}" font-size="${urlSize}" font-weight="400">cinima.app</text>
</g>`;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${lineEls}
  ${brand}
</svg>`;
  return renderSvgWithMulish(svg);
}

async function cardShadowLayer(posterWidth: number, posterHeight: number): Promise<Buffer> {
  const pad = 28;
  const w = posterWidth + pad * 2;
  const h = posterHeight + pad * 2;
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: await sharp(
          Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${pad}" y="${pad + 10}" width="${posterWidth}" height="${posterHeight}"
    rx="${POSTER_RADIUS}" fill="#000000" fill-opacity="0.55"/>
</svg>`)
        )
          .png()
          .toBuffer(),
        top: 0,
        left: 0,
      },
    ])
    .blur(16)
    .png()
    .toBuffer();
}

async function dimPoster(poster: Buffer, opacity: number): Promise<Buffer> {
  const meta = await sharp(poster).metadata();
  const w = meta.width ?? 1;
  const h = meta.height ?? 1;
  const veil = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 28, g: 31, b: 51, alpha: 1 - opacity },
    },
  })
    .png()
    .toBuffer();
  return sharp(poster)
    .composite([{ input: veil, blend: "over" }])
    .png()
    .toBuffer();
}

async function composeCanvas(canvas: CanvasSpec): Promise<void> {
  const sizes = SHELF.map((c) => {
    const height = Math.round(canvas.maxCardH * c.scale);
    const width = Math.round(height * ASPECT);
    return { ...c, width, height };
  });

  const rowWidth =
    sizes.reduce((sum, c) => sum + c.width, 0) + CARD_GAP * (sizes.length - 1);
  let cursorX = Math.round((canvas.width - rowWidth) / 2);

  const cards = sizes.map((c, index) => {
    const left = cursorX;
    cursorX += c.width + CARD_GAP;
    return {
      ...c,
      index,
      left,
      top: canvas.height - canvas.bottomPad - c.height,
    };
  });

  const textLeft = cards[0]!.left;
  const textRight = cards[cards.length - 1]!.left + cards[cards.length - 1]!.width;

  const layers: { input: Buffer; top: number; left: number }[] = [];

  layers.push({
    input: await sharp(hexPatternBackgroundSvg(canvas.width, canvas.height)).png().toBuffer(),
    top: 0,
    left: 0,
  });

  // Paint sides first so larger center cards sit on top.
  const paintOrder = [...cards].sort((a, b) => {
    const da = Math.abs(a.index - (cards.length - 1) / 2);
    const db = Math.abs(b.index - (cards.length - 1) / 2);
    return db - da;
  });

  for (const card of paintOrder) {
    const local = ensurePosterLocal(card.posterPath);
    let poster = await roundedPosterPng(
      fs.readFileSync(local),
      card.width,
      card.height
    );
    if (!card.recommended) {
      poster = await dimPoster(poster, 0.74);
    }

    if (!card.recommended) {
      const shadow = await cardShadowLayer(card.width, card.height);
      layers.push({
        input: shadow,
        top: Math.max(0, card.top - 28),
        left: Math.max(0, card.left - 28),
      });
    }

    if (card.recommended) {
      const glow = await posterGoldGlowLayer(card.width, card.height);
      layers.push({
        input: glow,
        top: Math.max(0, card.top - GLOW_PAD),
        left: Math.max(0, card.left - GLOW_PAD),
      });
    }

    if (card.recommended) {
      const badgeSize = Math.max(34, Math.round(card.width * 0.24));
      const badge = await sharp(recommendBadgeSvg(badgeSize)).png().toBuffer();
      const badgeMeta = await sharp(badge).metadata();
      const inset = Math.round(card.width * 0.045);
      poster = await sharp(poster)
        .composite([
          {
            input: badge,
            top: inset,
            left: card.width - (badgeMeta.width ?? badgeSize) - inset,
          },
        ])
        .png()
        .toBuffer();
    }

    layers.push({ input: poster, top: card.top, left: card.left });
  }

  layers.push({
    input: overlayCopySvg({
      width: canvas.width,
      height: canvas.height,
      textLeft,
      textRight,
      firstY: canvas.firstY,
      typeScale: canvas.typeScale ?? 1,
    }),
    top: 0,
    left: 0,
  });

  const out = path.join(OUT_DIR, canvas.filename);

  await sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 3,
      background: BG,
    },
  })
    .composite(layers)
    .png()
    .toFile(out);

  console.log(`Wrote ${out} (${canvas.width}×${canvas.height})`);
}

async function main() {
  if (!fs.existsSync(MULISH_BOLD) || !fs.existsSync(MULISH_REGULAR)) {
    throw new Error(`Mulish fonts missing under ${FONT_DIR}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const canvas of CANVASES) {
    await composeCanvas(canvas);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
