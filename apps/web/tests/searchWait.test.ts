import { describe, expect, it } from "vitest";
import { SEARCH_WAIT_DEADLINE_MS, searchWait } from "../src/lib/searchWait";

describe("search wait", () => {
  it("shows recent searches when the query is empty", () => {
    expect(
      searchWait({ query: "", loading: false, failed: false, resultCount: 0 })
    ).toBe("history");
  });

  it("keeps Searching while the request is in flight", () => {
    expect(
      searchWait({
        query: "Apple",
        loading: true,
        failed: false,
        resultCount: 0,
      })
    ).toBe("searching");
  });

  it("offers Retry when the search did not finish, not No results found", () => {
    expect(
      searchWait({
        query: "Apple",
        loading: false,
        failed: true,
        resultCount: 0,
      })
    ).toBe("retry");
  });

  it("does not treat a finished empty search as Retry", () => {
    expect(
      searchWait({
        query: "Apple",
        loading: false,
        failed: false,
        resultCount: 0,
      })
    ).toBe("empty");
  });

  it("keeps title cards when a refresh fails", () => {
    expect(
      searchWait({
        query: "Apple",
        loading: false,
        failed: true,
        resultCount: 2,
      })
    ).toBe("results");
  });

  it("uses an 8 second client deadline", () => {
    expect(SEARCH_WAIT_DEADLINE_MS).toBe(8_000);
  });
});
