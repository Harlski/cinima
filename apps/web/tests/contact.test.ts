import { describe, expect, it } from "vitest";
import {
  INQUIRIES_EMAIL,
  cinimaSocial,
  inquiriesMailto,
  landingCopy,
  unavailableCopy,
} from "../src/lib/contact";

describe("Unavailable contact", () => {
  it("asks visitors to email inquiries@cinima.app", () => {
    expect(INQUIRIES_EMAIL).toBe("inquiries@cinima.app");
    expect(inquiriesMailto()).toBe("mailto:inquiries@cinima.app");
    expect(unavailableCopy.heading).toBe("Cinima isn't available yet");
    expect(unavailableCopy.lead).toBe("For now, reach out to");
  });

  it("reserves X and Telegram with no links", () => {
    expect(cinimaSocial).toEqual([
      { name: "X", icon: "logos-twitter-mono", href: null },
      { name: "Telegram", icon: "logos-telegram-mono", href: null },
    ]);
  });
});

describe("Landing copy", () => {
  it("explains Cinima and that it is Pay-only", () => {
    expect(landingCopy.kicker).toBe("A Nimiq Pay Mini App");
    expect(landingCopy.title).toMatch(/taste discovery/i);
    expect(landingCopy.payOnly).toMatch(/only available inside Nimiq Pay/i);
    expect(landingCopy.cta).toMatch(/NIMIQ PAY/i);
  });
});
