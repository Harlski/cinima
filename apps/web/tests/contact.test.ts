import { describe, expect, it } from "vitest";
import {
  CINIMA_X_URL,
  GET_NIMIQ_PAY_URL,
  INQUIRIES_EMAIL,
  cinimaSocial,
  inquiriesMailto,
  landingCopy,
  payOnlyGateCopy,
} from "../src/lib/contact";
import { landingPosters } from "../src/lib/landingPosters";

describe("Landing contact", () => {
  it("exposes X and Email; no Telegram", () => {
    expect(INQUIRIES_EMAIL).toBe("cinima.app@gmail.com");
    expect(inquiriesMailto()).toBe("mailto:cinima.app@gmail.com");
    expect(CINIMA_X_URL).toBe("https://x.com/cinima_app");
    expect(cinimaSocial).toEqual([
      { name: "X", icon: "logos-twitter-mono", href: "https://x.com/cinima_app" },
      { name: "Email", icon: "envelope", href: "mailto:cinima.app@gmail.com" },
    ]);
    expect(cinimaSocial.some((c) => c.name === "Telegram")).toBe(false);
  });
});

describe("Landing copy", () => {
  it("explains Cinima with Explore and Enter CTAs", () => {
    expect(landingCopy.kicker).toBe("A Nimiq Pay Mini App");
    expect(landingCopy.title).toMatch(/taste discovery/i);
    expect(landingCopy.ctaExplore).toMatch(/Explore CINIMA/i);
    expect(landingCopy.ctaEnter).toBe("Enter CINIMA");
    expect(landingCopy).not.toHaveProperty("payOnly");
  });
});

describe("Pay-only gate copy", () => {
  it("explains Nimiq Pay exclusivity with install and inquiry links", () => {
    expect(payOnlyGateCopy.title).toBe("Sorry!");
    expect(payOnlyGateCopy.body).toMatch(/only available via Nimiq Pay/i);
    expect(payOnlyGateCopy.alreadyInstalled).toBe("Already Installed?");
    expect(payOnlyGateCopy.alreadyInstalledOpen).toBe("open");
    expect(payOnlyGateCopy.getNimiqPay).toBe("Get Nimiq Pay");
    expect(payOnlyGateCopy.inquiries).toBe("Inquiries?");
    expect(GET_NIMIQ_PAY_URL).toBe("https://nimpay.app/");
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
