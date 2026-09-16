import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useForYouMotionStore } from "../src/stores/forYouMotion";

describe("For You refill pending slots", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("hides every strip slot before refill clones are bound", () => {
    const store = useForYouMotionStore();
    store.beginRefill(5);
    expect([...store.pendingRefillSlots]).toEqual([0, 1, 2, 3, 4]);
  });

  it("shows cards again if refill clones cannot start", () => {
    const store = useForYouMotionStore();
    store.beginRefill(5);
    expect(store.playRefill([{ title: "Alpha" }])).toBe(false);
    expect([...store.pendingRefillSlots]).toEqual([]);
  });

  it("shows For You cards again after a landing Enter clears leftover refill hides", () => {
    const store = useForYouMotionStore();
    store.pendingRefillSlots = [0, 1, 2, 3, 4];
    store.reset();
    expect([...store.pendingRefillSlots]).toEqual([]);
    expect(store.fizzles).toEqual([]);
    expect(store.refills).toEqual([]);
  });

  it("reveals the live slot before the flying clone is dropped", () => {
    const frames: FrameRequestCallback[] = [];
    const previousRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }) as typeof requestAnimationFrame;
    try {
      const store = useForYouMotionStore();
      store.pendingRefillSlots = [2];
      store.refills = [
        {
          id: 9,
          slot: 2,
          from: { left: 0, top: 0, width: 10, height: 10 },
          to: { left: 20, top: 40, width: 90, height: 135 },
          posterUrl: null,
          titleName: "Centerpiece",
          delayMs: 0,
          selected: true,
        },
      ];
      store.dismissRefill(9);
      expect([...store.pendingRefillSlots]).toEqual([]);
      expect(store.refills).toHaveLength(1);
      frames.shift()?.(0);
      expect(store.refills).toHaveLength(1);
      frames.shift()?.(0);
      expect(store.refills).toEqual([]);
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
    }
  });

  it("keeps later refill clones when an earlier card has already landed", () => {
    const frames: FrameRequestCallback[] = [];
    const previousRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }) as typeof requestAnimationFrame;
    try {
      const store = useForYouMotionStore();
      const box = { left: 0, top: 0, width: 10, height: 10 };
      store.pendingRefillSlots = [0, 1];
      store.refills = [
        {
          id: 1,
          slot: 0,
          from: box,
          to: box,
          posterUrl: null,
          titleName: "Alpha",
          delayMs: 0,
          selected: false,
        },
        {
          id: 2,
          slot: 1,
          from: box,
          to: box,
          posterUrl: null,
          titleName: "Bravo",
          delayMs: 90,
          selected: true,
        },
      ];
      store.dismissRefill(1);
      expect([...store.pendingRefillSlots]).toEqual([1]);
      expect(store.refills.map((item) => item.id)).toEqual([1, 2]);
      frames.shift()?.(0);
      frames.shift()?.(0);
      expect(store.refills.map((item) => item.id)).toEqual([2]);
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
    }
  });
});
