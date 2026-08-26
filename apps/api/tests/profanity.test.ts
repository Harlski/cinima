import { describe, expect, it } from "vitest";
import { containsProfanity, censorProfanity } from "../src/lib/profanity.js";

describe("profanity", () => {
  it("detects plain and separator-obfuscated handles", () => {
    expect(containsProfanity("fuck")).toBe(true);
    expect(containsProfanity("shit_head")).toBe(true);
    expect(containsProfanity("asshole99")).toBe(true);
  });

  it("allows clean usernames", () => {
    expect(containsProfanity("cinephile")).toBe(false);
    expect(containsProfanity("night_owl")).toBe(false);
    expect(containsProfanity("classic")).toBe(false);
  });

  it("still censors comment text", () => {
    expect(censorProfanity("What the fuck")).not.toMatch(/fuck/i);
  });
});
