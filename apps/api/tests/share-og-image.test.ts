import { describe, expect, it } from "vitest";
import {
  renderProfileShareOgImage,
  renderTitleShareOgImage,
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
} from "../src/lib/shareOgImage.js";

describe("shareOgImage", () => {
  it("renders a branded profile Share preview PNG without a poster", async () => {
    const png = await renderProfileShareOgImage({ handle: "alice" });
    expect(png.length).toBeGreaterThan(500);
    const meta = await import("sharp").then(({ default: sharp }) => sharp(png).metadata());
    expect(meta.width).toBe(SHARE_OG_IMAGE_WIDTH);
    expect(meta.height).toBe(SHARE_OG_IMAGE_HEIGHT);
    expect(meta.format).toBe("png");
  });

  it("renders a branded title Share preview PNG without a poster", async () => {
    const png = await renderTitleShareOgImage({
      handle: "alice",
      titleName: "Fight Club",
    });
    expect(png.length).toBeGreaterThan(500);
    const meta = await import("sharp").then(({ default: sharp }) => sharp(png).metadata());
    expect(meta.width).toBe(SHARE_OG_IMAGE_WIDTH);
    expect(meta.height).toBe(SHARE_OG_IMAGE_HEIGHT);
  });
});
