import { describe, expect, it } from "vitest";
import {
  initialSuggestionWindow,
  nextSuggestionWindow,
} from "../src/lib/suggestionDeck";

const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
  title: { id: `t${n}` },
}));

describe("suggestionDeck", () => {
  it("initial window draws a sized sample from the pool", () => {
    let n = 0;
    const seq = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.55, 0.45];
    const random = () => seq[n++ % seq.length]!;
    const a = initialSuggestionWindow(pool, 7, random);
    expect(a).toHaveLength(7);
    expect(new Set(a.map((x) => x.title.id)).size).toBe(7);
  });

  it("next window prefers unused titles", () => {
    const current = pool.slice(0, 7).map((x) => x.title.id);
    const next = nextSuggestionWindow(pool, current, 7, () => 0.5);
    expect(next).toHaveLength(3);
    expect(next.every((item) => ["t8", "t9", "t10"].includes(item.title.id))).toBe(
      true
    );
  });
});
