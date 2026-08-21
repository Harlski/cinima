import { describe, expect, it } from "vitest";
import {
  INQUIRIES_EMAIL,
  cinimaSocial,
  inquiriesMailto,
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
