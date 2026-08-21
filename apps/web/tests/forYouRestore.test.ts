import { afterEach, describe, expect, it } from "vitest";
import {
  captureForYouSelection,
  loadForYouSelection,
  restoreForYouWindow,
  saveForYouSelection,
} from "../src/lib/forYouRestore";

function item(id: string) {
  return { title: { id } };
}

function ids(items: { title: { id: string } }[]) {
  return items.map((entry) => entry.title.id);
}

const pool = [
  item("a"),
  item("b"),
  item("c"),
  item("d"),
  item("e"),
  item("f"),
  item("g"),
  item("h"),
  item("i"),
  item("j"),
];

describe("restoreForYouWindow", () => {
  it("uses the first window and center card when nothing is remembered", () => {
    const restored = restoreForYouWindow(pool, null);
    expect(ids(restored.window)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("d");
  });

  it("lands on the remembered title in its remembered window", () => {
    const restored = restoreForYouWindow(pool, {
      windowIds: ["c", "d", "e", "h", "i"],
      selectedTitleId: "h",
    });
    expect(ids(restored.window)).toEqual(["c", "d", "e", "h", "i"]);
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("h");
  });

  it("keeps the remembered title when a neighbor left the pool", () => {
    const restored = restoreForYouWindow(
      [item("c"), item("e"), item("h"), item("i")],
      {
        windowIds: ["c", "d", "e", "h", "i"],
        selectedTitleId: "h",
      }
    );
    expect(ids(restored.window)).toEqual(["c", "e", "h", "i"]);
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("h");
  });

  it("uses the first window when none of the remembered titles remain", () => {
    const restored = restoreForYouWindow(pool, {
      windowIds: ["x", "y"],
      selectedTitleId: "x",
    });
    expect(ids(restored.window)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("d");
  });

  it("centers the remaining window when the remembered title left the pool", () => {
    const restored = restoreForYouWindow(pool, {
      windowIds: ["c", "d", "e"],
      selectedTitleId: "gone",
    });
    expect(ids(restored.window)).toEqual(["c", "d", "e"]);
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("d");
  });
});

describe("captureForYouSelection", () => {
  it("records the window ids and the selected title", () => {
    expect(captureForYouSelection([item("c"), item("h"), item("i")], 1)).toEqual({
      windowIds: ["c", "h", "i"],
      selectedTitleId: "h",
    });
  });

  it("returns null when there is no selected title", () => {
    expect(captureForYouSelection([], 0)).toBeNull();
    expect(captureForYouSelection([item("a")], 3)).toBeNull();
  });
});

describe("For You selection memory", () => {
  afterEach(() => {
    saveForYouSelection(null);
  });

  it("restores the same title after a later recall", () => {
    const window = [item("c"), item("h"), item("i")];
    saveForYouSelection(captureForYouSelection(window, 1));
    const restored = restoreForYouWindow(pool, loadForYouSelection());
    expect(restored.window[restored.selectedIndex]?.title.id).toBe("h");
    expect(ids(restored.window)).toEqual(["c", "h", "i"]);
  });
});
