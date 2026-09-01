import { describe, expect, it } from "vitest";
import {
  LOADING_WAIT_LINES,
  nextLoadingLineIndex,
  shuffledLoadingLines,
} from "../src/lib/loadingWait";

describe("loading wait lines", () => {
  it("includes the cinema wait lines", () => {
    expect(LOADING_WAIT_LINES).toContain("Preparing the popcorn");
    expect(LOADING_WAIT_LINES).toContain("Rewinding the tape");
  });

  it("shuffles to a permutation of the same lines", () => {
    const seq = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3, 0.7, 0.4, 0.6, 0, 0.15, 0.85];
    let n = 0;
    const out = shuffledLoadingLines(LOADING_WAIT_LINES, () => seq[n++] ?? 0);
    expect(out).toHaveLength(LOADING_WAIT_LINES.length);
    expect([...out].sort()).toEqual([...LOADING_WAIT_LINES].sort());
    expect(out.join("|")).not.toBe(LOADING_WAIT_LINES.join("|"));
  });

  it("wraps to the first line after the last", () => {
    expect(nextLoadingLineIndex(0, 3)).toBe(1);
    expect(nextLoadingLineIndex(2, 3)).toBe(0);
    expect(nextLoadingLineIndex(0, 0)).toBe(0);
  });
});
