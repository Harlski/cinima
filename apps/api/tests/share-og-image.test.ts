import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  composeIdenticonPosterGridOg,
  renderProfileShareOgImage,
  renderTitleShareOgImage,
  renderWatchlistShareOgImage,
  shareOgFontFilesPresent,
  shareOgIdenticonSlot,
  shareOgPosterGridSlots,
  shareOgPosterSlot,
  shareOgTitlePosterSlot,
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
} from "../src/lib/shareOgImage.js";

const FIXTURE_POSTER = path.join(tmpdir(), "cinima-og-poster-fixture.jpg");

describe("shareOgImage template", () => {
  it("centers the poster with left/top/right padding", () => {
    const slot = shareOgPosterSlot(780, 1170);
    const contentHeight = SHARE_OG_IMAGE_HEIGHT - 116;
    expect(slot.height).toBeLessThanOrEqual(Math.round(contentHeight * 0.8));
    expect(slot.left).toBeGreaterThan(40);
    expect(slot.top).toBe(40);
    expect(slot.left + slot.width).toBeLessThan(SHARE_OG_IMAGE_WIDTH - 40);
    expect(Math.abs(slot.left - (SHARE_OG_IMAGE_WIDTH - slot.width - slot.left))).toBeLessThanOrEqual(1);
  });

  it("places the title poster on the left with copy space on the right", () => {
    const slot = shareOgTitlePosterSlot(780, 1170);
    expect(slot.left).toBe(56);
    expect(slot.top).toBeGreaterThan(20);
    expect(slot.textColumnLeft).toBeGreaterThan(slot.left + slot.width);
    expect(slot.textColumnLeft + slot.textColumnWidth).toBeLessThan(SHARE_OG_IMAGE_WIDTH - 40);
  });

  it("places the Identicon on the left of the identity column", () => {
    const slot = shareOgIdenticonSlot();
    expect(slot.width).toBe(128);
    expect(slot.height).toBe(128);
    expect(slot.left).toBe(48);
    expect(slot.top).toBe(80);
    expect(slot.top + slot.height).toBeLessThan(SHARE_OG_IMAGE_HEIGHT - 116);
  });

  it("lays out up to eight posters in two rows of four beside the Identicon", () => {
    const identicon = shareOgIdenticonSlot();
    const slots = shareOgPosterGridSlots(8);
    expect(slots).toHaveLength(8);
    expect(slots[0]).toEqual({ width: 152, height: 228, left: 220, top: 40 });
    expect(slots[3]).toEqual({ width: 152, height: 228, left: 718, top: 40 });
    expect(slots[4]).toEqual({ width: 152, height: 228, left: 220, top: 282 });
    expect(slots[7]).toEqual({ width: 152, height: 228, left: 718, top: 282 });
    for (const slot of slots) {
      expect(slot.left).toBeGreaterThan(identicon.left + identicon.width);
      expect(slot.left + slot.width).toBeLessThan(SHARE_OG_IMAGE_WIDTH - 40);
      expect(slot.top + slot.height).toBeLessThan(SHARE_OG_IMAGE_HEIGHT - 116);
    }
  });

  it("returns only as many poster slots as requested, capped at eight", () => {
    expect(shareOgPosterGridSlots(0)).toEqual([]);
    expect(shareOgPosterGridSlots(3)).toHaveLength(3);
    expect(shareOgPosterGridSlots(12)).toHaveLength(8);
  });

  it("ships Mulish fonts for Share preview SVG text", () => {
    expect(shareOgFontFilesPresent()).toBe(true);
  });

  it("renders readable title, handle, and brand text with a full poster column", async () => {
    let poster: Buffer;
    try {
      poster = readFileSync(FIXTURE_POSTER);
    } catch {
      const res = await fetch(
        "https://image.tmdb.org/t/p/w780/fwH0ePhd7m3swtCuFeubtR49ZTd.jpg",
        { headers: { "User-Agent": "CinimaSharePreview/1.0" }, signal: AbortSignal.timeout(15_000) }
      );
      expect(res.ok).toBe(true);
      poster = Buffer.from(await res.arrayBuffer());
      writeFileSync(FIXTURE_POSTER, poster);
    }

    const png = await renderTitleShareOgImage({
      handle: "creator",
      titleName: "Under the Dome",
      posterBuffer: poster,
    });
    expect(png.length).toBeGreaterThan(20_000);

    const dir = mkdtempSync(path.join(tmpdir(), "cinima-og-ocr-"));
    const out = path.join(dir, "card.png");
    writeFileSync(out, png);

    let ocr = "";
    try {
      ocr = execFileSync("tesseract", [out, "stdout", "-l", "eng"], {
        encoding: "utf8",
        timeout: 20_000,
      });
    } catch {
      // CI images may lack tesseract; fonts + layout asserts still run above.
      return;
    }

    // OCR can misread Mulish glyphs; require brand + handle at minimum.
    expect(ocr).toMatch(/CINIMA/);
    expect(ocr).toMatch(/creator/i);
  }, 30_000);

  it("composites Identicon and poster grid into a 1200x630 Share preview", async () => {
    const identiconSlot = shareOgIdenticonSlot();
    const posterSlots = shareOgPosterGridSlots(2);
    const identicon = await solidPng(identiconSlot.width, identiconSlot.height, {
      r: 32,
      g: 160,
      b: 64,
    });
    const posterA = await solidPng(200, 300, { r: 220, g: 40, b: 40 });
    const posterB = await solidPng(200, 300, { r: 40, g: 80, b: 220 });

    const png = await composeIdenticonPosterGridOg({
      identicon,
      headline: "alice",
      subline: "Favorite movies & TV on Cinima",
      posters: [posterA, posterB],
    });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(SHARE_OG_IMAGE_WIDTH);
    expect(meta.height).toBe(SHARE_OG_IMAGE_HEIGHT);
    expect(meta.format).toBe("png");

    const identiconPixel = await samplePng(
      png,
      identiconSlot.left + 20,
      identiconSlot.top + 20
    );
    expect(identiconPixel.g).toBeGreaterThan(identiconPixel.r);
    expect(identiconPixel.g).toBeGreaterThan(identiconPixel.b);

    const firstPoster = posterSlots[0]!;
    const posterPixel = await samplePng(
      png,
      firstPoster.left + 40,
      firstPoster.top + 40
    );
    expect(posterPixel.r).toBeGreaterThan(160);
    expect(posterPixel.g).toBeLessThan(80);

    const ocr = ocrPng(png);
    if (ocr != null) {
      expect(ocr).toMatch(/CINIMA/);
      expect(ocr).toMatch(/alice/i);
    }
  }, 30_000);

  it("renders a profile Share preview PNG with Handle, brand, and Identicon", async () => {
    expect(shareOgFontFilesPresent()).toBe(true);

    const poster = await solidPng(200, 300, { r: 200, g: 30, b: 30 });
    const png = await renderProfileShareOgImage({
      handle: "alice",
      walletAddress: "NQ05SHAREOGIMAGETESTWALLET0000001",
      posterBuffers: [poster],
    });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(png.length).toBeGreaterThan(20_000);

    const first = shareOgPosterGridSlots(1)[0]!;
    const posterPixel = await samplePng(png, first.left + 40, first.top + 40);
    expect(posterPixel.r).toBeGreaterThan(160);

    const ocr = ocrPng(png);
    if (ocr != null) {
      expect(ocr).toMatch(/CINIMA/);
      expect(ocr).toMatch(/alice/i);
    }
  }, 30_000);

  it("renders a Watchlist Share preview PNG with Handle, brand, and Identicon", async () => {
    expect(shareOgFontFilesPresent()).toBe(true);

    const poster = await solidPng(200, 300, { r: 200, g: 30, b: 30 });
    const png = await renderWatchlistShareOgImage({
      handle: "alice",
      walletAddress: "NQ05SHAREOGIMAGETESTWALLET0000001",
      posterBuffers: [poster],
    });
    const meta = await sharp(png).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(png.length).toBeGreaterThan(20_000);

    const first = shareOgPosterGridSlots(1)[0]!;
    const posterPixel = await samplePng(png, first.left + 40, first.top + 40);
    expect(posterPixel.r).toBeGreaterThan(160);

    const ocr = ocrPng(png);
    if (ocr != null) {
      expect(ocr).toMatch(/CINIMA/);
      expect(ocr).toMatch(/alice/i);
    }
  }, 30_000);
});

async function solidPng(
  width: number,
  height: number,
  color: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function samplePng(
  png: Buffer,
  x: number,
  y: number
): Promise<{ r: number; g: number; b: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const idx = (y * info.width + x) * info.channels;
  return { r: data[idx]!, g: data[idx + 1]!, b: data[idx + 2]! };
}

function ocrPng(png: Buffer): string | null {
  const dir = mkdtempSync(path.join(tmpdir(), "cinima-og-ocr-"));
  const out = path.join(dir, "card.png");
  writeFileSync(out, png);
  try {
    return execFileSync("tesseract", [out, "stdout", "-l", "eng"], {
      encoding: "utf8",
      timeout: 20_000,
    });
  } catch {
    return null;
  }
}
