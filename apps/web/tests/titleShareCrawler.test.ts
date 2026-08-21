import { describe, expect, it } from "vitest";
import { isTitleShareCrawler, TITLE_SHARE_PATH } from "../src/lib/titleShareCrawler";

describe("Title Share crawler detection", () => {
  it("treats Facebook and X bots as crawlers", () => {
    expect(isTitleShareCrawler("facebookexternalhit/1.1")).toBe(true);
    expect(isTitleShareCrawler("Twitterbot/1.0")).toBe(true);
  });

  it("does not treat a normal browser as a crawler", () => {
    expect(
      isTitleShareCrawler(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0.0.0"
      )
    ).toBe(false);
  });

  it("matches a Title Share path", () => {
    expect(TITLE_SHARE_PATH.test("/alice/t/movie/550")).toBe(true);
    expect(TITLE_SHARE_PATH.test("/alice")).toBe(false);
  });
});
