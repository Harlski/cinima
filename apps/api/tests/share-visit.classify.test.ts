import { describe, expect, it } from "vitest";
import {
  isShareVisitCrawler,
  shareVisitChannel,
  shareVisitIntent,
} from "@cinima/shared";

describe("Share visit classification", () => {
  it("classifies channel as web or pay", () => {
    expect(shareVisitChannel(false)).toBe("web");
    expect(shareVisitChannel(true)).toBe("pay");
  });

  it("defaults intent to open and accepts pay_cta", () => {
    expect(shareVisitIntent(undefined)).toBe("open");
    expect(shareVisitIntent(null)).toBe("open");
    expect(shareVisitIntent("open")).toBe("open");
    expect(shareVisitIntent("pay_cta")).toBe("pay_cta");
    expect(shareVisitIntent("other")).toBe("open");
  });

  it("treats social crawler user-agents as crawlers", () => {
    expect(isShareVisitCrawler("Twitterbot/1.0")).toBe(true);
    expect(isShareVisitCrawler("facebookexternalhit/1.1")).toBe(true);
    expect(
      isShareVisitCrawler(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0"
      )
    ).toBe(false);
  });
});
