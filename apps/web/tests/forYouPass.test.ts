import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isPassSwipe,
  lockPassAxis,
  passDragProgress,
  passFizzleAt,
  passStripSnapBehavior,
  passCollapseDeckAction,
  passCollapseCanApplyPool,
  passCollapseShouldHold,
  addPassLeavingId,
  removePassLeavingId,
  forYouRefillDelay,
  forYouRefillOrder,
  forYouRefillStart,
  forYouRefillLandKeyframes,
  canPassForYouSlot,
  scheduleForYouRefillHandoff,
  shouldPlayForYouMotion,
  FOR_YOU_REFILL_MS,
  FOR_YOU_REFILL_STAGGER_MS,
  FOR_YOU_REFILL_LAND_MS,
  PASS_COLLAPSE_MS,
  PASS_FIZZLE_MS,
} from "../src/lib/forYouPass";

const pickerSrc = readFileSync(
  path.resolve(__dirname, "../src/components/TitleDeckPicker.vue"),
  "utf8"
);

function cssBlock(src: string, selector: string): string {
  const match = src.match(
    new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{[^}]*\\}`)
  );
  if (!match) throw new Error(`missing CSS block ${selector}`);
  return match[0];
}

describe("Pass swipe", () => {
  it("locks vertical for Pass and horizontal for the strip", () => {
    expect(lockPassAxis(0, 0)).toBeNull();
    expect(lockPassAxis(4, -4)).toBeNull();
    expect(lockPassAxis(0, -40)).toBe("y");
    expect(lockPassAxis(40, -8)).toBe("x");
  });

  it("treats a steep upward swipe as a Pass", () => {
    expect(isPassSwipe(0, -80)).toBe(true);
    expect(isPassSwipe(20, -80)).toBe(true);
  });

  it("ignores a tap, a downward swipe, and a mostly horizontal pan", () => {
    expect(isPassSwipe(0, -8)).toBe(false);
    expect(isPassSwipe(0, 80)).toBe(false);
    expect(isPassSwipe(120, -20)).toBe(false);
  });

  it("resists the pull so a Pass feels like a flick", () => {
    expect(passDragProgress(0)).toBe(0);
    expect(passDragProgress(40)).toBe(0);
    expect(passDragProgress(-56)).toBeLessThan(56 / 120);
    expect(passDragProgress(-120)).toBeLessThan(0.5);
    expect(passDragProgress(-120)).toBeGreaterThan(passDragProgress(-56));
  });

  it("keeps the card near the finger at the start of a Pass pull", () => {
    const origin = { left: 160, top: 620, width: 90, height: 140 };
    const header = { left: 165, top: 8, width: 80, height: 24 };
    const dy = -40;
    const point = passFizzleAt(passDragProgress(dy), origin, header);
    expect(-point.y).toBeLessThanOrEqual(40);
  });
});

describe("For You refill", () => {
  it("turns slots on as 4 2 1 3 5 so the center card stays in the middle", () => {
    expect(forYouRefillOrder(5)).toEqual([2, 1, 3, 0, 4]);
    expect(
      [0, 1, 2, 3, 4].map((slot) => forYouRefillOrder(5).indexOf(slot) + 1)
    ).toEqual([4, 2, 1, 3, 5]);
  });

  it("pops cards in quickly so the next one is already on the way", () => {
    expect(FOR_YOU_REFILL_STAGGER_MS).toBeLessThan(FOR_YOU_REFILL_MS);
    expect(forYouRefillDelay(2, 5)).toBe(0);
    expect(forYouRefillDelay(1, 5)).toBe(FOR_YOU_REFILL_STAGGER_MS);
    expect(forYouRefillDelay(3, 5)).toBe(2 * FOR_YOU_REFILL_STAGGER_MS);
    expect(forYouRefillDelay(0, 5)).toBe(3 * FOR_YOU_REFILL_STAGGER_MS);
    expect(forYouRefillDelay(4, 5)).toBe(4 * FOR_YOU_REFILL_STAGGER_MS);
    expect(forYouRefillDelay(4, 5) + FOR_YOU_REFILL_MS).toBeLessThan(900);
  });

  it("keeps the flying card at destination size while it travels from CINIMA", () => {
    const from = { left: 10, top: 8, width: 24, height: 16 };
    const to = { left: 200, top: 500, width: 90, height: 135 };
    expect(forYouRefillStart(from, to)).toEqual({ dx: -223, dy: -551.5 });
  });

  it("squishes then springs back to full height when a card lands", () => {
    const frames = forYouRefillLandKeyframes();
    expect(frames[0]).toMatchObject({ x: 1, y: 1, offset: 0 });
    expect(frames.some((frame) => frame.y < 1 && frame.x > 1)).toBe(true);
    expect(frames.every((frame) => frame.y <= 1)).toBe(true);
    expect(frames.at(-1)).toMatchObject({ x: 1, y: 1, offset: 1 });
    expect(FOR_YOU_REFILL_LAND_MS).toBeGreaterThan(0);
    const cloneSrc = readFileSync(
      path.resolve(__dirname, "../src/components/ForYouRefillClone.vue"),
      "utf8"
    );
    expect(cloneSrc).toContain("forYouRefillLandKeyframes");
    expect(cloneSrc).toContain("FOR_YOU_REFILL_LAND_MS");
    expect(cloneSrc).toMatch(/transform-origin:\s*center bottom/);
    expect(cloneSrc).toContain("commitStyles");
    expect(cloneSrc).not.toContain(':style="startStyle"');
    expect(cloneSrc).not.toMatch(/motion\.cancel\(/);
    expect(cloneSrc).toMatch(/transform:\s*scale\(0\.92\)/);
    expect(cloneSrc).toMatch(/for-you-refill-poster--selected[\s\S]*transform:\s*scale\(1\)/);
  });
});

describe("Pass fizzle", () => {
  it("rises, shrinks, and fades out", () => {
    expect(passFizzleAt(0)).toEqual({ x: 0, y: 0, scale: 1, opacity: 1 });
    expect(passFizzleAt(1)).toEqual({ x: 0, y: -120, scale: 0.3, opacity: 0 });
  });

  it("tosses toward the CINIMA header on a curve that goes up first", () => {
    const origin = { left: 20, top: 600, width: 80, height: 120 };
    const header = { left: 160, top: 8, width: 80, height: 24 };
    expect(passFizzleAt(0, origin, header)).toMatchObject({
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
    });
    const end = passFizzleAt(1, origin, header);
    expect(end.x).toBe(140);
    expect(end.y).toBe(-640);
    expect(end.scale).toBe(0.3);
    expect(end.opacity).toBe(0);
    const mid = passFizzleAt(0.5, origin, header);
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(end.x / 2);
    expect(mid.y).toBeLessThan(end.y / 2);
  });
});

describe("Pass strip collapse", () => {
  it("eases remaining cards into the Passed slot instead of snapping", () => {
    expect(PASS_COLLAPSE_MS).toBeGreaterThan(0);
    expect(PASS_COLLAPSE_MS).toBeLessThanOrEqual(PASS_FIZZLE_MS);
    expect(passStripSnapBehavior(false)).toBe("smooth");
    expect(passStripSnapBehavior(true)).toBe("auto");
    const wrap = cssBlock(pickerSrc, ".poster-wrap");
    expect(wrap).toMatch(/transition:/);
    const collapsing = cssBlock(pickerSrc, ".poster-wrap--collapsing");
    expect(collapsing).toMatch(/flex-basis:\s*0/);
    expect(collapsing).toMatch(/width:\s*0/);
  });

  it("draws the selected title-card gold outline inside the card so the strip cannot clip it", () => {
    const poster = cssBlock(pickerSrc, ".strip-poster");
    expect(poster).toMatch(/box-sizing:\s*border-box/);
    expect(poster).toMatch(/border:\s*2px solid transparent/);
    const selected = cssBlock(pickerSrc, ".strip-poster.is-selected");
    expect(selected).toMatch(/border-color:\s*var\(--gold\)/);
    expect(selected).not.toMatch(/box-shadow:\s*0 0 0 2px/);
  });

  it("does not freeze the strip when a later swipe has not been accepted yet", () => {
    expect(
      passCollapseDeckAction({
        collapsingIds: ["b"],
        nextIds: ["b", "c", "d", "e"],
      })
    ).toBe("apply");
  });

  it("holds local cards only while the Passed title is leaving", () => {
    expect(
      passCollapseDeckAction({
        collapsingIds: ["a"],
        nextIds: ["b", "c", "d", "e"],
      })
    ).toBe("collapse-removed");
  });

  it("does not restore a Passed card while the live set still contains it", () => {
    expect(
      passCollapseCanApplyPool({
        leavingIds: ["a"],
        nextIds: ["a", "b", "c", "d"],
      })
    ).toBe(false);
    expect(
      passCollapseCanApplyPool({
        leavingIds: ["a"],
        nextIds: ["b", "c", "d"],
      })
    ).toBe(true);
    expect(
      passCollapseCanApplyPool({
        leavingIds: [],
        nextIds: ["a", "b"],
      })
    ).toBe(true);
    expect(
      passCollapseShouldHold({
        leavingIds: ["a"],
        nextIds: ["a", "b", "c"],
        elapsedMs: 400,
      })
    ).toBe(true);
    expect(
      passCollapseShouldHold({
        leavingIds: ["a"],
        nextIds: ["b", "c"],
        elapsedMs: 400,
      })
    ).toBe(false);
    expect(
      passCollapseShouldHold({
        leavingIds: ["a"],
        nextIds: ["a", "b", "c"],
        elapsedMs: 8_000,
      })
    ).toBe(false);
    expect(pickerSrc).toContain("passCollapseShouldHold");
    expect(pickerSrc).toContain("finishPassCollapse");
  });

  it("keeps an earlier Passed card hidden while a later Pass collapses", () => {
    expect(addPassLeavingId(["a"], "b")).toEqual(["a", "b"]);
    expect(addPassLeavingId(["a"], "a")).toEqual(["a"]);
    expect(removePassLeavingId(["a", "b"], "b")).toEqual(["a"]);
    expect(
      passCollapseDeckAction({
        collapsingIds: ["a", "b"],
        nextIds: ["b", "c", "d"],
      })
    ).toBe("collapse-removed");
    expect(pickerSrc).toMatch(/leavingPassIds\.includes\(item\.title\.id\)/);
    expect(pickerSrc).toMatch(
      /collapsingPassIds\.includes\(item\.title\.id\)/
    );
  });

  it("hides the selected title while refill clones are still flying in", () => {
    expect(cssBlock(pickerSrc, ".detail--refill-pending")).toMatch(
      /visibility:\s*hidden/
    );
    expect(cssBlock(pickerSrc, ".detail--refill-pending")).not.toMatch(
      /opacity:\s*0/
    );
  });

  it("does not fade the live card in after the flying clone is gone", () => {
    expect(pickerSrc).toMatch(
      /\.strip-poster\.strip-poster--refill-pending[\s\S]*?visibility:\s*hidden/
    );
    expect(pickerSrc).not.toMatch(
      /\.strip-poster\.strip-poster--refill-pending[\s\S]*?opacity:\s*0;/
    );
    const frames: FrameRequestCallback[] = [];
    const raf = ((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }) as typeof requestAnimationFrame;
    let dropped = false;
    scheduleForYouRefillHandoff(() => {
      dropped = true;
    }, raf);
    expect(dropped).toBe(false);
    frames.shift()?.(0);
    expect(dropped).toBe(false);
    frames.shift()?.(0);
    expect(dropped).toBe(true);
  });

  it("does not accept a Pass until every For You card has landed", () => {
    expect(canPassForYouSlot(0, [0, 1, 2, 3, 4])).toBe(false);
    expect(canPassForYouSlot(2, [0, 1, 3, 4])).toBe(false);
    expect(canPassForYouSlot(2, [])).toBe(true);
    expect(pickerSrc).toMatch(/onCardPointerDown[\s\S]*!canPassForYouSlot/);
    expect(cssBlock(pickerSrc, ".strip--refilling .poster-wrap")).toMatch(
      /pointer-events:\s*none/
    );
  });
});

describe("For You motion gates", () => {
  it("plays Pass and refill motion during the Guided tour For You Pass", () => {
    expect(
      shouldPlayForYouMotion({
        tourActive: true,
        tourForYouPass: true,
        onboarding: false,
        reduceMotion: false,
      })
    ).toBe(true);
  });

  it("holds motion on other Guided tour steps and during Favorites onboarding", () => {
    expect(
      shouldPlayForYouMotion({
        tourActive: true,
        tourForYouPass: false,
        onboarding: false,
        reduceMotion: false,
      })
    ).toBe(false);
    expect(
      shouldPlayForYouMotion({
        tourActive: false,
        onboarding: true,
        reduceMotion: false,
      })
    ).toBe(false);
  });
});
