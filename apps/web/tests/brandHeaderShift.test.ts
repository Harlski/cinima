import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  brandHeaderMoveCommitted,
  brandHeaderMovePending,
  brandHeaderShiftAfterDrag,
  clearBrandHeaderMovePending,
  noteBrandHeaderMove,
  clampBrandHeaderShift,
  loadBrandHeaderShift,
  saveBrandHeaderShift,
} from "../src/lib/brandHeaderShift";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("brand header shift", () => {
  it("keeps the wordmark inside the header", () => {
    expect(clampBrandHeaderShift(-12, 180)).toBe(0);
    expect(clampBrandHeaderShift(40, 180)).toBe(40);
    expect(clampBrandHeaderShift(240, 180)).toBe(180);
  });

  it("moves from the drag start and stops at the edges", () => {
    expect(brandHeaderShiftAfterDrag(0, 36, 180)).toBe(36);
    expect(brandHeaderShiftAfterDrag(20, -50, 180)).toBe(0);
    expect(brandHeaderShiftAfterDrag(160, 40, 180)).toBe(180);
  });

  it("counts a drag that leaves the wordmark in a new place", () => {
    expect(brandHeaderMoveCommitted(0, 0)).toBe(false);
    expect(brandHeaderMoveCommitted(0, 36)).toBe(true);
    expect(brandHeaderMoveCommitted(36, 36)).toBe(false);
    expect(brandHeaderMoveCommitted(40, 0)).toBe(true);
  });

  it("remembers a wordmark move until Credits has heard it", () => {
    const storage = memoryStorage();
    expect(brandHeaderMovePending(storage)).toBe(false);
    noteBrandHeaderMove(storage);
    expect(brandHeaderMovePending(storage)).toBe(true);
    clearBrandHeaderMovePending(storage);
    expect(brandHeaderMovePending(storage)).toBe(false);
  });

  it("reports a committed wordmark move to Credits", () => {
    const src = readFileSync(
      new URL("../src/components/AppBrandHeader.vue", import.meta.url),
      "utf8"
    );
    expect(src).toContain("brandHeaderMoveCommitted");
    expect(src).toContain("/usage/brand-header-move");
  });

  it("saves the chosen shift on this device", () => {
    const storage = memoryStorage();
    expect(loadBrandHeaderShift(storage)).toBe(0);
    saveBrandHeaderShift(48, storage);
    expect(loadBrandHeaderShift(storage)).toBe(48);
    saveBrandHeaderShift(-8, storage);
    expect(loadBrandHeaderShift(storage)).toBe(0);
  });
});
