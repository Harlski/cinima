/**
 * Compose X header (1500×500) from title posters in a flat-top hex grid.
 *
 * Supports two modes:
 * 1) Default mode: honeycomb lattice.
 * 2) Config mode: independent row controls + offsets (matches XHeaderLab export).
 *
 * Example:
 * pnpm --filter @cinima/web compose:x-header -- --config /tmp/x-header-config.json
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  flatTopHexGridPreviewSvg,
  flatTopHexGridSpacing,
  flatTopHexSvgPath,
  layoutFlatTopHoneycomb,
  validateFlatTopHexGrid,
} from "../src/lib/flatTopHexGrid.js";
import { assignUniqueHeaderPosters, headerPosters } from "../src/lib/headerPosters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/social");

const W = 1500;
const H = 500;
const BG = "#1c1f33";
const GOLD = "#E5C158";
const TMDB_IMG_BASE = "https://image.tmdb.org/t/p/w500";
const POSTER_CACHE_DIR = "/tmp/cinima-header/header-posters";
const LOCAL_FALLBACK_DIR = "/tmp/cinima-header/posters";

type RowConfigIn = {
  id: number;
  y: number;
  enabled: boolean;
  originX: number;
  offsetX: number;
  colPitch?: number;
  colMin?: number;
  colMax?: number;
};

type XHeaderConfigIn = {
  radius: number;
  gap: number;
  originX: number;
  colMin: number;
  strokeWidth: number;
  inset: number;
  rows: RowConfigIn[];
  colMax?: number | null;
  wrapRows?: boolean;
};

const DEFAULT_CONFIG: XHeaderConfigIn = {
  radius: 128,
  gap: 30,
  originX: -32,
  colMin: -1,
  strokeWidth: 2.5,
  inset: 1.2,
  rows: [],
  colMax: null,
  wrapRows: true,
};

function parseArgs(argv: string[]) {
  const idx = argv.indexOf("--config");
  const configPath = idx >= 0 ? argv[idx + 1] : undefined;
  return { configPath };
}

function loadConfig(configPath?: string): XHeaderConfigIn {
  if (!configPath) return DEFAULT_CONFIG;
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw) as Partial<XHeaderConfigIn>;
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    rows: parsed.rows ?? [],
  };
}

function withWrappedRows(rows: RowConfigIn[]): RowConfigIn[] {
  const enabled = rows.filter((r) => r.enabled).sort((a, b) => a.y - b.y);
  if (enabled.length < 2) return rows;

  const topA = enabled[0]!;
  const topB = enabled[1]!;
  const dyTop = topB.y - topA.y || 1;
  const wrapTop: RowConfigIn = {
    ...topB,
    id: topA.id - 1000,
    y: topA.y - dyTop,
    enabled: true,
  };

  const botB = enabled[enabled.length - 1]!;
  const botA = enabled[enabled.length - 2]!;
  const dyBottom = botB.y - botA.y || 1;
  const wrapBottom: RowConfigIn = {
    ...botA,
    id: botB.id + 1000,
    y: botB.y + dyBottom,
    enabled: true,
  };

  return [wrapTop, ...rows, wrapBottom];
}

async function hexPosterTile(args: {
  posterSrc: string | null;
  center: { x: number; y: number };
  radius: number;
  gap: number;
  inset: number;
  strokeWidth: number;
}) {
  const { posterSrc, center, radius, gap, inset, strokeWidth } = args;
  const { width: hexW, height: hexH } = flatTopHexGridSpacing(radius, gap);

  // Render slightly larger then crop via mask.
  const bw = Math.ceil(hexW) + 10;
  const bh = Math.ceil(hexH) + 10;
  const localCenter = { x: bw / 2, y: bh / 2 };
  const r = radius - inset;

  let clipped: Buffer;
  if (posterSrc) {
    const cover = await sharp(posterSrc)
      .resize(bw, bh, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    const mask = Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">
  <path d="${flatTopHexSvgPath(localCenter, r)}" fill="white"/>
</svg>`
    );

    clipped = await sharp(cover)
      .composite([{ input: await sharp(mask).png().toBuffer(), blend: "dest-in" }])
      .png()
      .toBuffer();
  } else {
    clipped = await sharp({
      create: {
        width: bw,
        height: bh,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
  }

  const ring = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" fill="none">
  <path d="${flatTopHexSvgPath(localCenter, r)}" stroke="${GOLD}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
</svg>`
  );

  const buf = await sharp(clipped)
    .composite([{ input: await sharp(ring).png().toBuffer(), blend: "over" }])
    .png()
    .toBuffer();

  return {
    input: buf,
    left: Math.round(center.x - bw / 2),
    top: Math.round(center.y - bh / 2),
    tileW: bw,
    tileH: bh,
  };
}

function posterPathToCacheFile(posterPath: string) {
  const name = path.basename(posterPath);
  return path.join(POSTER_CACHE_DIR, name);
}

function ensurePosterLocal(posterPath: string): string {
  fs.mkdirSync(POSTER_CACHE_DIR, { recursive: true });
  const out = posterPathToCacheFile(posterPath);
  if (fs.existsSync(out)) return out;

  const url = `${TMDB_IMG_BASE}${posterPath.startsWith("/") ? "" : "/"}${posterPath}`;
  // -f : fail on HTTP errors; -s : silent; -L : follow redirects.
  try {
    execSync(`curl -fsSL -A "Mozilla/5.0" "${url}" -o "${out}"`, {
      stdio: "ignore",
    });
    return out;
  } catch {
    // Some poster paths may be stale/invalid. Fall back to a known-good poster.
    const files = fs
      .readdirSync(LOCAL_FALLBACK_DIR, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith(".jpg"))
      .map((f) => path.join(LOCAL_FALLBACK_DIR, f.name));
    if (!files.length) {
      throw new Error(
        `Failed to download poster ${posterPath} and no local fallback posters exist in ${LOCAL_FALLBACK_DIR}`
      );
    }
    return files[0]!;
  }
}

async function main() {
  const { configPath } = parseArgs(process.argv.slice(2));
  const config = loadConfig(configPath);

  if (!headerPosters.length) {
    throw new Error("headerPosters is empty - cannot compose header");
  }

  const sourceRows =
    config.wrapRows === false ? config.rows : withWrappedRows(config.rows);

  const gridOpts = {
    radius: config.radius,
    gap: config.gap,
    bounds: { width: W, height: H },
    originX: config.originX,
    colMin: config.colMin,
    colMax: config.colMax ?? undefined,
    rows: sourceRows.map((r) => ({
      id: r.id,
      y: r.y,
      enabled: r.enabled,
      originX: r.originX,
      offsetX: r.offsetX,
      colPitch: r.colPitch ?? undefined,
      colMin: r.colMin ?? undefined,
      colMax: r.colMax ?? undefined,
    })),
  };

  const cells = layoutFlatTopHoneycomb(gridOpts);
  const validation = validateFlatTopHexGrid(cells, gridOpts, config.inset);
  if (!validation.ok) {
    // In “independent row” mode, artists often tune y/origin/offset by eye.
    // Validation is still useful as a warning, but we render anyway so
    // iteration stays fast.
    console.warn(
      `Hex grid validation warning: minGap=${validation.minGap.toFixed(
        1
      )} stagger=${validation.staggerPx.toFixed(1)} (gap=${config.gap}). Rendering anyway.`
    );
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Wireframe preview (handy for verifying the format)
  const previewSvg = flatTopHexGridPreviewSvg(gridOpts, GOLD, BG, BG);
  await sharp(Buffer.from(previewSvg)).png().toFile(path.join(OUT_DIR, "x-header-grid-preview.png"));

  const tiles = [];
  const posters = assignUniqueHeaderPosters(cells, config.radius, {
    width: W,
    height: H,
  });
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const poster = posters[i];
    const posterLocal = poster ? ensurePosterLocal(poster.posterPath) : null;
    tiles.push(
      await hexPosterTile({
        posterSrc: posterLocal,
        center: cell.center,
        radius: config.radius,
        gap: config.gap,
        inset: config.inset,
        strokeWidth: config.strokeWidth,
      })
    );
  }

  // Compute bounding box so we can composite even when cells extend beyond banner.
  const minLeft = Math.min(...tiles.map((t) => t.left));
  const minTop = Math.min(...tiles.map((t) => t.top));
  const maxRight = Math.max(...tiles.map((t) => t.left + t.tileW));
  const maxBottom = Math.max(...tiles.map((t) => t.top + t.tileH));

  const bigW = Math.ceil(maxRight - minLeft);
  const bigH = Math.ceil(maxBottom - minTop);
  const shiftX = -minLeft;
  const shiftY = -minTop;

  const base = await sharp({
    create: {
      width: bigW,
      height: bigH,
      channels: 3,
      background: BG,
    },
  })
    .png()
    .toBuffer();

  const composed = await sharp(base).composite(
    tiles.map((t) => ({
      input: t.input,
      left: t.left + shiftX,
      top: t.top + shiftY,
    }))
  );

  // Extract the banner region.
  await composed
    .extract({ left: shiftX, top: shiftY, width: W, height: H })
    .png()
    .toFile(path.join(OUT_DIR, "x-header.png"));

  console.log(`Wrote ${path.join(OUT_DIR, "x-header.png")} (${cells.length} hexes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

