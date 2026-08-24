import { describe, expect, it } from "vitest";
import {
  clearSearchResultsCache,
  loadSearchResults,
  saveSearchResults,
} from "../src/lib/searchResultsCache";

describe("searchResultsCache", () => {
  it("returns cached results for a trimmed query key", () => {
    clearSearchResultsCache();
    const titles = [{ id: "tmdb:movie:1" } as never];
    saveSearchResults("  matrix  ", titles);
    expect(loadSearchResults("matrix")).toEqual(titles);
    expect(loadSearchResults(" matrix ")).toEqual(titles);
  });
});
