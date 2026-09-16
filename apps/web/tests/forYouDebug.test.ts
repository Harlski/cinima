import { describe, expect, it } from "vitest";
import {
  FOR_YOU_DEBUG_STORAGE_KEY,
  formatForYouDebugDump,
  isForYouDebugEnabled,
  isForYouDebugQuery,
  subscribeForYouDebug,
  syncForYouDebugFromQuery,
  toggleForYouDebug,
} from "../src/lib/forYouDebug";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
  };
}

describe("For You on-device debug", () => {
  it("turns on from a debug query so Pay can keep it after Landing Enter", () => {
    const store = memoryStore();
    expect(isForYouDebugQuery({ debug: "fy" })).toBe(true);
    expect(syncForYouDebugFromQuery({ debug: "fy" }, store)).toBe(true);
    expect(store.getItem(FOR_YOU_DEBUG_STORAGE_KEY)).toBe("1");
    expect(isForYouDebugEnabled(store)).toBe(true);
  });

  it("does not re-emit when debug is already on from the query", () => {
    const store = memoryStore();
    let emits = 0;
    const stop = subscribeForYouDebug(() => {
      emits += 1;
    });
    syncForYouDebugFromQuery({ debug: "fy" }, store);
    syncForYouDebugFromQuery({ debug: "fy" }, store);
    stop();
    expect(emits).toBe(1);
  });

  it("toggles off without leaving leftover session state", () => {
    const store = memoryStore({ [FOR_YOU_DEBUG_STORAGE_KEY]: "1" });
    expect(toggleForYouDebug(store)).toBe(false);
    expect(isForYouDebugEnabled(store)).toBe(false);
  });

  it("formats a dump a Handle can screenshot or share from Pay", () => {
    const text = formatForYouDebugDump({
      at: "2026-09-16T01:00:00.000Z",
      href: "https://cinima.app/discover?forYou=refresh",
      inPay: true,
      ua: "NimiqPay",
      inner: { w: 390, h: 844 },
      visual: { offsetTop: 0, height: 700, width: 390 },
      vvCss: { offsetTop: "0px", height: "700px", bottomInset: "144px" },
      discover: { mode: "overlap", tab: "for-you", n: "0", loading: "0", handle: "0" },
      motion: { pending: [0, 1, 2, 3, 4], fizzles: 0, refills: 0 },
      slots: [],
      selected: null,
      picker: null,
      logs: ["01:00:00.000 debug on"],
    });
    expect(text).toContain('"n": "0"');
    expect(text).toContain('"pending": [');
    expect(text).toContain("NimiqPay");
  });
});
