import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const webRoot = path.resolve(__dirname, "..");

const overlaySources = [
  "src/components/ConfirmDialog.vue",
  "src/components/WatchlistLeaveDialog.vue",
  "src/components/SendNimDialog.vue",
  "src/components/FolloweePeekSheet.vue",
  "src/components/FavoritersSheet.vue",
  "src/components/FindPeopleSheet.vue",
  "src/components/ShareLinkSheet.vue",
  "src/components/ShareTitleSheet.vue",
  "src/components/ShareWatchlistSheet.vue",
  "src/components/PayOnlyGateModal.vue",
  "src/components/PayTitleModal.vue",
  "src/components/ReturnDigestHost.vue",
  "src/components/JoinOverlayHost.vue",
  "src/components/GuidedTourHost.vue",
  "src/views/Me.vue",
];

describe("popup modal chrome", () => {
  it("keeps overlay wash off and glows the card", () => {
    const css = readFileSync(path.join(webRoot, "src/assets/style.css"), "utf8");
    expect(css).toContain(".confirm-modal,");
    expect(css).toContain(".confirm-modal > .nq-card,");
    expect(css).toMatch(
      /\.confirm-modal,[\s\S]*?\.tour-done \{\s*background: transparent;/
    );
    expect(css).toContain("0 0 18px rgba(255, 255, 255, 0.42)");
    expect(css).toContain('url("./hex-pattern.svg")');
    expect(css).toContain("mix-blend-mode: screen");
    expect(css).toContain("mask-image:");

    const leave = readFileSync(
      path.join(webRoot, "src/components/WatchlistLeaveDialog.vue"),
      "utf8"
    );
    const send = readFileSync(
      path.join(webRoot, "src/components/SendNimDialog.vue"),
      "utf8"
    );
    expect(leave).toContain("bottom: calc(100% + 0.25rem);");
    expect(leave).not.toMatch(/\.reason-list\s*\{[^}]*\btop:\s*0;/s);
    expect(send).toContain("bottom: calc(100% + 0.25rem);");
    expect(send).not.toMatch(/\.send-nim-note-list\s*\{[^}]*\btop:\s*calc\(100%/s);

    for (const rel of overlaySources) {
      const src = readFileSync(path.join(webRoot, rel), "utf8");
      expect(src, rel).not.toMatch(
        /-(modal|offer|done)\s*\{[^}]*background:\s*color-mix/s
      );
    }
  });
});
