import { describe, expect, it, beforeEach } from "vitest";
import {
  clearTitleLookups,
  loadTitleLookups,
  pushTitleLookup,
} from "../src/lib/searchTitleLookups";

const sample = {
  id: "tmdb:movie:1",
  title: "One",
  posterUrl: null,
  mediaType: "movie" as const,
  year: 2001,
};

describe("searchTitleLookups", () => {
  beforeEach(() => {
    clearTitleLookups();
  });

  it("keeps the last 3 title lookups, newest first", () => {
    pushTitleLookup({ ...sample, id: "tmdb:movie:1", title: "One" });
    pushTitleLookup({ ...sample, id: "tmdb:movie:2", title: "Two" });
    pushTitleLookup({ ...sample, id: "tmdb:movie:3", title: "Three" });
    pushTitleLookup({ ...sample, id: "tmdb:movie:4", title: "Four" });

    expect(loadTitleLookups().map((t) => t.title)).toEqual([
      "Four",
      "Three",
      "Two",
    ]);
  });

  it("moves a repeated lookup to the front", () => {
    pushTitleLookup({ ...sample, id: "tmdb:movie:1", title: "One" });
    pushTitleLookup({ ...sample, id: "tmdb:movie:2", title: "Two" });
    pushTitleLookup({ ...sample, id: "tmdb:movie:1", title: "One" });

    expect(loadTitleLookups().map((t) => t.id)).toEqual([
      "tmdb:movie:1",
      "tmdb:movie:2",
    ]);
  });
});
