import { describe, expect, it } from "vitest";
import {
  INQUIRIES_EMAIL,
  cinimaSocial,
  inquiriesMailto,
  landingCopy,
} from "../src/lib/contact";
import { landingPosters } from "../src/lib/landingPosters";

describe("Landing contact", () => {
  it("exposes inquiries@cinima.app as a mailto channel", () => {
    expect(INQUIRIES_EMAIL).toBe("inquiries@cinima.app");
    expect(inquiriesMailto()).toBe("mailto:inquiries@cinima.app");
    expect(cinimaSocial).toEqual([
      { name: "X", icon: "logos-twitter-mono", href: null },
      { name: "Telegram", icon: "logos-telegram-mono", href: null },
      { name: "Email", icon: "envelope", href: "mailto:inquiries@cinima.app" },
    ]);
  });
});

describe("Landing copy", () => {
  it("explains Cinima with Explore and Enter CTAs", () => {
    expect(landingCopy.kicker).toBe("A Nimiq Pay Mini App");
    expect(landingCopy.title).toMatch(/taste discovery/i);
    expect(landingCopy.ctaExplore).toMatch(/NIMIQ PAY/i);
    expect(landingCopy.ctaEnter).toBe("Enter CINIMA");
    expect(landingCopy).not.toHaveProperty("payOnly");
  });
});

describe("Landing poster marquee", () => {
  it("lists recent TMDB CDN posters for the hero scroll", () => {
    expect(landingPosters.length).toBeGreaterThanOrEqual(12);
    for (const poster of landingPosters) {
      expect(poster.src).toMatch(
        /^https:\/\/image\.tmdb\.org\/t\/p\/w185\/.+\.jpg$/
      );
      expect(poster.posterPath).toMatch(/^\//);
      expect(poster.id).toBeTruthy();
    }
  });
});
