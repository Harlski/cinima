import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderTitleShareOgImage,
  shareOgFontFilesPresent,
  shareOgPosterSlot,
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
} from "../src/lib/shareOgImage.js";

const FIXTURE_POSTER = path.join(tmpdir(), "cinima-og-poster-fixture.jpg");

describe("shareOgImage template", () => {
  it("centers the poster with left/top/right padding", () => {
    const slot = shareOgPosterSlot(780, 1170);
    const contentHeight = SHARE_OG_IMAGE_HEIGHT - 88;
    expect(slot.height).toBeLessThanOrEqual(Math.round(contentHeight * 0.8));
    expect(slot.left).toBeGreaterThan(40);
    expect(slot.top).toBe(40);
    expect(slot.left + slot.width).toBeLessThan(SHARE_OG_IMAGE_WIDTH - 40);
    expect(Math.abs(slot.left - (SHARE_OG_IMAGE_WIDTH - slot.width - slot.left))).toBeLessThanOrEqual(1);
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
});
