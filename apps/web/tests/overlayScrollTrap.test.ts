import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SCROLL_TRAP_ATTR } from "../src/lib/touchScrollGuard";

const webRoot = path.resolve(__dirname, "..");

/** Blocking overlays (full root) and non-blocking chrome (bar / coach card). */
const overlayTrapSources = [
  "src/components/ConfirmDialog.vue",
  "src/components/WatchlistLeaveDialog.vue",
  "src/components/SendNimDialog.vue",
  "src/components/FolloweePeekSheet.vue",
  "src/components/FavoritersSheet.vue",
  "src/components/FindPeopleSheet.vue",
  "src/components/ShareLinkSheet.vue",
  "src/components/ShareTitleSheet.vue",
  "src/components/ShareWatchlistSheet.vue",
  "src/components/CommentComposer.vue",
  "src/components/PayOnlyGateModal.vue",
  "src/components/PayTitleModal.vue",
  "src/components/ReturnDigestHost.vue",
  "src/components/JoinOverlayHost.vue",
  "src/components/GuidedTourHost.vue",
  "src/components/WelcomeOverlay.vue",
  "src/components/MarqueeHost.vue",
  "src/components/RecommendCue.vue",
  "src/components/HeatMap.vue",
  "src/views/Me.vue",
];

describe("overlay scroll trap", () => {
  it("marks overlay chrome so a swipe cannot rubber-band the page", () => {
    expect(SCROLL_TRAP_ATTR).toBe("data-scroll-trap");
    for (const rel of overlayTrapSources) {
      const src = readFileSync(path.join(webRoot, rel), "utf8");
      expect(src, rel).toContain(SCROLL_TRAP_ATTR);
    }
  });

  it("traps Guided tour offer, done, and coach card separately", () => {
    const src = readFileSync(
      path.join(webRoot, "src/components/GuidedTourHost.vue"),
      "utf8"
    );
    expect(src).toMatch(/class="tour-offer"[\s\S]*?data-scroll-trap/);
    expect(src).toMatch(/class="tour-done"[\s\S]*?data-scroll-trap/);
    expect(src).toMatch(/class="tour-coach-card nq-card"[\s\S]*?data-scroll-trap/);
  });
});
