import { describe, expect, it } from "vitest";
import {
  isShareOgCrawler,
  parseShareOgPath,
  SHORT_SHARE_PATH,
  TITLE_SHARE_PATH,
} from "../src/lib/shareOgCrawler";

describe("Share OG crawler detection", () => {
  it("treats Facebook and X bots as crawlers", () => {
    expect(isShareOgCrawler("facebookexternalhit/1.1")).toBe(true);
    expect(isShareOgCrawler("Twitterbot/1.0")).toBe(true);
  });

  it("does not treat a normal browser as a crawler", () => {
    expect(
      isShareOgCrawler(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0.0.0"
      )
    ).toBe(false);
  });

  it("matches share paths", () => {
    expect(SHORT_SHARE_PATH.test("/s/abc12345")).toBe(true);
    expect(TITLE_SHARE_PATH.test("/alice/t/movie/550")).toBe(true);
    expect(TITLE_SHARE_PATH.test("/alice")).toBe(false);
  });

  it("parses profile, title, and short share paths", () => {
    expect(parseShareOgPath("/s/abc12345")).toEqual({
      type: "short",
      code: "abc12345",
    });
    expect(parseShareOgPath("/alice/t/movie/550")).toEqual({
      type: "title",
      handle: "alice",
      mediaType: "movie",
      tmdbId: "550",
    });
    expect(parseShareOgPath("/alice")).toEqual({
      type: "profile",
      handle: "alice",
    });
    expect(parseShareOgPath("/discover")).toBeNull();
    expect(parseShareOgPath("/alice/t/show/550")).toBeNull();
  });
});
