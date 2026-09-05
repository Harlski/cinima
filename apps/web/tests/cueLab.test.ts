import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_KINDS } from "@cinima/shared";
import {
  cueLabEntryVisible,
  cueLabMarqueeKinds,
  cueLabOverlayIds,
} from "../src/lib/cueLab";

describe("Cue lab", () => {
  it("previews a Marquee for every Achievement", () => {
    expect(cueLabMarqueeKinds()).toEqual([
      "opening-night",
      "full-house",
      "word-of-mouth",
      "whats-next",
      "bravo",
      "encore",
      "high-seas",
      "season-ticket",
      "thats-a-wrap",
    ]);
    expect(cueLabMarqueeKinds()).toEqual([...ACHIEVEMENT_KINDS]);
  });

  it("lists overlay previews for cues, Welcome, Guided tour, and product modals", () => {
    expect(cueLabOverlayIds()).toEqual([
      "recommend-cue",
      "welcome",
      "welcome-back",
      "tour-offer",
      "tour-skip-notice",
      "tour-start",
      "confirm",
      "pay-only-gate",
      "pay-title",
      "share-sheet",
    ]);
  });

  it("hides the Cue lab entry outside the signed-in shell", () => {
    expect(cueLabEntryVisible({ inAppShell: false })).toBe(false);
  });

  it("shows the Cue lab entry in the signed-in shell during Vite DEV", () => {
    expect(cueLabEntryVisible({ inAppShell: true })).toBe(true);
  });
});
