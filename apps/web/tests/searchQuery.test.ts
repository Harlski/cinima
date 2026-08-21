import { describe, expect, it } from "vitest";
import { parseSearchQuery, searchRouteQuery } from "../src/lib/searchQuery";

describe("parseSearchQuery", () => {
  it("treats a missing q as no active search", () => {
    expect(parseSearchQuery(undefined)).toBe("");
  });

  it("reads the active search from q", () => {
    expect(parseSearchQuery("Inception")).toBe("Inception");
  });

  it("uses the first q when the router repeats the key", () => {
    expect(parseSearchQuery(["Dune", "Dune 2"])).toBe("Dune");
  });

  it("treats a null q as no active search", () => {
    expect(parseSearchQuery(null)).toBe("");
  });
});

describe("searchRouteQuery", () => {
  it("puts a live query on the search route", () => {
    expect(searchRouteQuery("Heat")).toEqual({ q: "Heat" });
  });

  it("drops q when the box is empty so Back can show Recent searches", () => {
    expect(searchRouteQuery("")).toEqual({});
  });

  it("drops q when the box is only spaces", () => {
    expect(searchRouteQuery("   ")).toEqual({});
  });

  it("keeps inner spaces so a restored search matches what was typed", () => {
    expect(searchRouteQuery("  Heat  ")).toEqual({ q: "  Heat  " });
  });
});
