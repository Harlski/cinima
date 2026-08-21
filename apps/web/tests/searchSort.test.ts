import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { TitleSummary } from "@cinima/shared";
import {
  loadSearchSort,
  saveSearchSort,
  sortSearchResults,
} from "../src/lib/searchSort";

function title(
  partial: Partial<TitleSummary> & Pick<TitleSummary, "id" | "title">
): TitleSummary {
  return {
    mediaType: "movie",
    kind: "movie",
    tmdbId: 1,
    year: null,
    posterUrl: null,
    overview: null,
    rating: null,
    popularity: null,
    imdbId: null,
    ...partial,
  };
}

describe("sortSearchResults", () => {
  it("puts the highest Popularity last (nearest the search box)", () => {
    const ordered = sortSearchResults(
      [
        title({ id: "tmdb:movie:1", title: "Quiet Hit", popularity: 10 }),
        title({ id: "tmdb:movie:2", title: "Blockbuster", popularity: 90 }),
        title({ id: "tmdb:movie:3", title: "Mid", popularity: 40 }),
      ],
      "popularity"
    );
    expect(ordered.map((t) => t.title)).toEqual([
      "Quiet Hit",
      "Mid",
      "Blockbuster",
    ]);
  });

  it("puts the highest Rating last", () => {
    const ordered = sortSearchResults(
      [
        title({ id: "tmdb:movie:1", title: "Okay", rating: 6.2 }),
        title({ id: "tmdb:movie:2", title: "Great", rating: 8.7 }),
        title({ id: "tmdb:movie:3", title: "Good", rating: 7.4 }),
      ],
      "rating"
    );
    expect(ordered.map((t) => t.title)).toEqual(["Okay", "Good", "Great"]);
  });

  it("puts the newest release year last", () => {
    const ordered = sortSearchResults(
      [
        title({ id: "tmdb:movie:1", title: "Old", year: 1972 }),
        title({ id: "tmdb:movie:2", title: "New", year: 2024 }),
        title({ id: "tmdb:movie:3", title: "Mid", year: 1999 }),
      ],
      "year"
    );
    expect(ordered.map((t) => t.title)).toEqual(["Old", "Mid", "New"]);
  });

  it("sends missing scores away from the search box", () => {
    const ordered = sortSearchResults(
      [
        title({ id: "tmdb:movie:1", title: "Known", popularity: 12 }),
        title({ id: "tmdb:movie:2", title: "Unknown", popularity: null }),
      ],
      "popularity"
    );
    expect(ordered.map((t) => t.title)).toEqual(["Unknown", "Known"]);
  });

  it("breaks ties by title A-Z", () => {
    const ordered = sortSearchResults(
      [
        title({ id: "tmdb:movie:1", title: "Zebra", rating: 8 }),
        title({ id: "tmdb:movie:2", title: "Alpha", rating: 8 }),
      ],
      "rating"
    );
    expect(ordered.map((t) => t.title)).toEqual(["Alpha", "Zebra"]);
  });

  it("does not mutate the input list", () => {
    const input = [
      title({ id: "tmdb:movie:1", title: "B", popularity: 2 }),
      title({ id: "tmdb:movie:2", title: "A", popularity: 1 }),
    ];
    sortSearchResults(input, "popularity");
    expect(input.map((t) => t.title)).toEqual(["B", "A"]);
  });
});

describe("search sort preference", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("defaults to Popularity", () => {
    expect(loadSearchSort()).toBe("popularity");
  });

  it("remembers a saved sort", () => {
    saveSearchSort("year");
    expect(loadSearchSort()).toBe("year");
  });

  it("falls back to Popularity when storage is garbage", () => {
    memory.set("cinima.searchSort", "hottest");
    expect(loadSearchSort()).toBe("popularity");
  });
});
