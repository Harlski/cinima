import { describe, expect, it } from "vitest";
import {
  deckCenterIndex,
  deckScrollLeftToCenter,
  rememberedSelectionForPreferred,
  resolveDeckScrollIndex,
  restoreDeckWindow,
  selectedIndexAfterDeckChange,
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
  it("starts on the center card when there is no remembered selection", () => {
    expect(deckCenterIndex(5)).toBe(2);
    expect(deckCenterIndex(4)).toBe(1);
    expect(deckCenterIndex(1)).toBe(0);
    const synced = syncDeckItems(titles("a", "b", "c", "d", "e"), null);
    expect(synced.selectedIndex).toBe(2);
    expect(synced.items[synced.selectedIndex]?.title.id).toBe("c");
  });

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

describe("selectedIndexAfterDeckChange", () => {
  it("moves to the adjacent card after a Pass, not the new center", () => {
    const five = ["1", "2", "3", "4", "5"];
    expect(selectedIndexAfterDeckChange(five, ["2", "3", "4", "5"], 0)).toBe(0);
    expect(["2", "3", "4", "5"][0]).toBe("2");
    expect(selectedIndexAfterDeckChange(five, ["1", "3", "4", "5"], 1)).toBe(1);
    expect(["1", "3", "4", "5"][1]).toBe("3");
  });

  it("keeps the current card when a neighbor is Passed", () => {
    expect(
      selectedIndexAfterDeckChange(["1", "2", "3", "4", "5"], ["2", "3", "4", "5"], 2)
    ).toBe(1);
  });

  it("stays on the new last card after Passing the far right", () => {
    expect(
      selectedIndexAfterDeckChange(["1", "2", "3", "4", "5"], ["1", "2", "3", "4"], 4)
    ).toBe(3);
  });

  it("centers a newly dealt For You set", () => {
    expect(
      selectedIndexAfterDeckChange(["5"], ["a", "b", "c", "d", "e"], 0)
    ).toBe(2);
    expect(selectedIndexAfterDeckChange([], ["a", "b", "c", "d", "e"], 0)).toBe(2);
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
