import { afterEach, describe, expect, it } from "vitest";
import type { TitleSummary } from "@cinima/shared";
import {
  clearSearchResultsCache,
  loadSearchResults,
  saveSearchResults,
} from "../src/lib/searchResultsCache";

function title(id: string, name: string): TitleSummary {
  return {
    id,
    title: name,
    mediaType: "movie",
    kind: "movie",
    tmdbId: 1,
    year: 1995,
    posterUrl: null,
    overview: null,
    rating: null,
    popularity: null,
    imdbId: null,
  };
}

const heat = [title("tmdb:movie:1", "Heat")];
const dune = [title("tmdb:movie:2", "Dune")];

describe("search results cache", () => {
  afterEach(() => {
    clearSearchResultsCache();
  });

  it("returns the titles saved for that query", () => {
    saveSearchResults("Heat", heat);
    expect(loadSearchResults("Heat")?.map((item) => item.title)).toEqual([
      "Heat",
    ]);
  });

  it("does not return titles saved for a different query", () => {
    saveSearchResults("Heat", heat);
    expect(loadSearchResults("Dune")).toBeNull();
  });

  it("treats surrounding spaces as the same query", () => {
    saveSearchResults("  Heat  ", heat);
    expect(loadSearchResults("Heat")?.map((item) => item.title)).toEqual([
      "Heat",
    ]);
  });

  it("does not return titles for an empty query", () => {
    saveSearchResults("Heat", heat);
    expect(loadSearchResults("")).toBeNull();
    expect(loadSearchResults("   ")).toBeNull();
  });

  it("keeps more than one query so Back can restore an earlier search", () => {
    saveSearchResults("Heat", heat);
    saveSearchResults("Dune", dune);
    expect(loadSearchResults("Heat")?.map((item) => item.title)).toEqual([
      "Heat",
    ]);
  });
});
