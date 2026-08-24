import { describe, expect, it } from "vitest";
import { layoutFlatTopHoneycomb } from "../src/lib/flatTopHexGrid";
import {
  assignUniqueHeaderPosters,
  headerPosters,
  hexIntersectsBounds,
} from "../src/lib/headerPosters";

describe("headerPosters", () => {
  it("has a unique posterPath for every entry", () => {
    const paths = headerPosters.map((p) => p.posterPath);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("never duplicates posters among visible tiles", () => {
    const bounds = { width: 1500, height: 500 };
    const radius = 145;
    const cells = layoutFlatTopHoneycomb({
      radius,
      gap: 237,
      bounds,
      originX: -172,
      colMin: -1,
      rows: [
        { id: -2, y: -107, enabled: true, originX: 55, offsetX: 0 },
        { id: -1, y: 158, enabled: true, originX: -156, offsetX: 213 },
        { id: 0, y: 23, enabled: true, originX: -172, offsetX: 0 },
        { id: 1, y: 290, enabled: true, originX: 69, offsetX: 216.75 },
        { id: 2, y: 422, enabled: true, originX: 60, offsetX: 0 },
        { id: 3, y: 551, enabled: true, originX: 71, offsetX: 216.75 },
      ],
    });

    const assigned = assignUniqueHeaderPosters(cells, radius, bounds);
    const visiblePaths: string[] = [];
    cells.forEach((cell, i) => {
      if (!hexIntersectsBounds(cell.center, radius, bounds)) return;
      const poster = assigned[i];
      if (poster) visiblePaths.push(poster.posterPath);
    });

    expect(visiblePaths.length).toBeGreaterThan(0);
    expect(new Set(visiblePaths).size).toBe(visiblePaths.length);
  });
});
