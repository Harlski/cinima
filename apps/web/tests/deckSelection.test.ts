import { describe, expect, it } from "vitest";
import {
  deckScrollLeftToCenter,
  rememberedSelectionForPreferred,
  resolveDeckScrollIndex,
  restoreDeckWindow,
  syncDeckItems,
  type DeckSelection,
} from "../src/lib/deckSelection";

function titles(...ids: string[]) {
  return ids.map((id) => ({ title: { id } }));
}

describe("resolveDeckScrollIndex", () => {
  it("keeps an explicitly clicked edge item when scroll snap centers a neighbor", () => {
    const clickedLast = 4;
    const nearestAfterScroll = 3;
    expect(resolveDeckScrollIndex(clickedLast, nearestAfterScroll)).toBe(clickedLast);
  });

  it("keeps an explicitly clicked first item when scroll snap centers the second", () => {
    const clickedFirst = 0;
    const nearestAfterScroll = 1;
    expect(resolveDeckScrollIndex(clickedFirst, nearestAfterScroll)).toBe(clickedFirst);
  });

  it("follows scroll position after the user drags the strip", () => {
    expect(resolveDeckScrollIndex(null, 2)).toBe(2);
  });
});

describe("deckScrollLeftToCenter", () => {
  it("centers the target poster and clamps to strip bounds", () => {
    const strip = {
      clientWidth: 300,
      scrollWidth: 700,
      children: [{ offsetLeft: 520, offsetWidth: 80 }],
    };
    expect(deckScrollLeftToCenter(strip, 0)).toBe(400);
    expect(
      deckScrollLeftToCenter(
        { ...strip, children: [{ offsetLeft: 0, offsetWidth: 80 }] },
        0
      )
    ).toBe(0);
  });
});

describe("restoreDeckWindow", () => {
  it("extracts a remembered window from a larger pool", () => {
    const remembered: DeckSelection = {
      itemIds: ["b", "c", "d"],
      selectedTitleId: "c",
    };
    const restored = restoreDeckWindow(titles("a", "b", "c", "d", "e"), remembered);
    expect(restored.items.map((item) => item.title.id)).toEqual(["b", "c", "d"]);
    expect(restored.selectedIndex).toBe(1);
  });
});

describe("syncDeckItems", () => {
  it("keeps parent order after a refresh reshuffles the same titles", () => {
    const remembered: DeckSelection = {
      itemIds: ["a", "b", "c", "d", "e", "f", "g"],
      selectedTitleId: "d",
    };
    const refreshed = titles("c", "a", "g", "b", "f", "e", "d");
    const synced = syncDeckItems(refreshed, remembered);

    expect(synced.items.map((item) => item.title.id)).toEqual([
      "c",
      "a",
      "g",
      "b",
      "f",
      "e",
      "d",
    ]);
    expect(synced.selectedIndex).toBe(6);
  });

  it("keeps parent order when refresh swaps in a new window", () => {
    const remembered: DeckSelection = {
      itemIds: ["a", "b", "c"],
      selectedTitleId: "b",
    };
    const synced = syncDeckItems(titles("h", "i", "j"), remembered);
    expect(synced.items.map((item) => item.title.id)).toEqual(["h", "i", "j"]);
    expect(synced.selectedIndex).toBe(1);
  });
});

describe("rememberedSelectionForPreferred", () => {
  it("forces the preferred tour title over session memory", () => {
    const fallback: DeckSelection = {
      itemIds: ["a", "b", "c"],
      selectedTitleId: "a",
    };
    const preferred = rememberedSelectionForPreferred(
      titles("a", "b", "c"),
      "c",
      fallback
    );
    expect(preferred).toEqual({
      itemIds: ["a", "b", "c"],
      selectedTitleId: "c",
    });
    const synced = syncDeckItems(titles("a", "b", "c"), preferred);
    expect(synced.selectedIndex).toBe(2);
  });

  it("falls back when preferred title is not on the list", () => {
    const fallback: DeckSelection = {
      itemIds: ["a", "b"],
      selectedTitleId: "b",
    };
    expect(
      rememberedSelectionForPreferred(titles("a", "b"), "missing", fallback)
    ).toBe(fallback);
    expect(rememberedSelectionForPreferred(titles("a", "b"), null, fallback)).toBe(
      fallback
    );
  });
});
