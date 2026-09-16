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
  "src/components/CommentComposer.vue",
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
      /\.confirm-modal,[\s\S]*?\.tour-coach \{\s*background: transparent;/
    );
    expect(css).toContain(".tour-coach > .tour-coach-card");
    expect(css).toContain('url("./hex-pattern.svg")');
    expect(css).toContain("mix-blend-mode: screen");
    expect(css).toMatch(
      /#app::before \{[\s\S]*?mask-image: linear-gradient\(\s*to bottom,[\s\S]*?transparent 42%,[\s\S]*?#000 100%/
    );
    expect(css).toMatch(
      /\.confirm-modal > \.nq-card::before,[\s\S]*?\.join-overlay-modal > \.join-overlay-panel::before,[\s\S]*?mask-image: linear-gradient\(\s*to bottom,[\s\S]*?transparent 42%,[\s\S]*?#000 100%/
    );
    expect(css).not.toContain("radial-gradient(ellipse 80% 70% at 12% 8%");
    expect(css).not.toContain("ellipse 85% 75% at 50% 28%");

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
    expect(send).toMatch(
      /\.send-nim-tip\s*\{[^}]*bottom:\s*calc\(100% \+ 0\.4rem\);/s
    );
    expect(send).toMatch(/\.send-nim-tip\s*\{[^}]*right:\s*50%;/s);
    expect(send).not.toMatch(/\.send-nim-tip\s*\{[^}]*\btop:\s*calc\(100%/s);
    expect(send).not.toMatch(
      /\.send-nim-tip\s*\{[^}]*transform:\s*translateX\(-50%\)/s
    );
    expect(send).toMatch(
      /\.send-nim-tip\s*\{[^}]*background:\s*var\(--colors-neutral-50\)/s
    );
    expect(send).toMatch(/\.send-nim-tip::before\s*\{[^}]*right:\s*0;/s);
    expect(send).toMatch(
      /\.send-nim-tip::before\s*\{[^}]*border-top-color:\s*var\(--border\)/s
    );
    expect(send).toMatch(/\.send-nim-tip::after\s*\{[^}]*right:\s*0;/s);
    expect(send).toMatch(
      /\.send-nim-tip::after\s*\{[^}]*border-top-color:\s*var\(--colors-neutral-50\)/s
    );

    for (const rel of overlaySources) {
      const src = readFileSync(path.join(webRoot, rel), "utf8");
      expect(src, rel).not.toMatch(
        /-(modal|offer|done)\s*\{[^}]*background:\s*color-mix/s
      );
    }
  });

  it("styles Join overlay thanks without Achievement copy", () => {
    const src = readFileSync(
      path.join(webRoot, "src/components/JoinOverlayHost.vue"),
      "utf8"
    );
    expect(src).toContain("join-overlay-sub");
    expect(src).toContain("text-transform: uppercase");
    expect(src).toContain("letter-spacing: 0.06em");
    expect(src).not.toMatch(/Achievement unlocked/i);
    expect(src).not.toContain("Joined the crew");
    expect(src).not.toContain("join-overlay-unlock");
    expect(src).not.toContain("join-overlay-achievement");
    expect(src).toContain("animation: join-overlay-hover");
    expect(src).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.join-overlay-panel \{[\s\S]*?animation: none/
    );
  });
});
