import { describe, expect, it } from "vitest";
import { searchFieldAction } from "../src/lib/searchField";

describe("searchFieldAction", () => {
  it("treats typing as a live search without recording history", () => {
    expect(searchFieldAction("input", "dune")).toEqual({
      kind: "live",
      query: "dune",
    });
  });

  it("treats the iOS Search key as a commit that records history", () => {
    expect(searchFieldAction("search", "dune")).toEqual({
      kind: "commit",
      query: "dune",
    });
  });

  it("treats form submit as a commit that records history", () => {
    expect(searchFieldAction("submit", "dune")).toEqual({
      kind: "commit",
      query: "dune",
    });
  });

  it("treats blur change as a live search so iOS still shows results", () => {
    expect(searchFieldAction("change", "dune")).toEqual({
      kind: "live",
      query: "dune",
    });
  });

  it("uses the native field value when Vue has not caught up", () => {
    expect(searchFieldAction("search", "heat").query).toBe("heat");
  });

  it("idles when the field is empty or only spaces", () => {
    expect(searchFieldAction("input", "")).toEqual({ kind: "idle", query: "" });
    expect(searchFieldAction("search", "   ")).toEqual({
      kind: "idle",
      query: "",
    });
  });
});
