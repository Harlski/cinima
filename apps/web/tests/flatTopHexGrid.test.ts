import { describe, expect, it } from "vitest";
import {
  flatTopHexGridPreviewSvg,
  flatTopHexGridSpacing,
  flatTopHexVertices,
  isFlatTopHex,
  layoutFlatTopHoneycomb,
  minPolygonDistance,
  validateFlatTopHexGrid,
} from "../src/lib/flatTopHexGrid";

const BANNER = { width: 1500, height: 500 };
const R = 128;
const GAP = 14;

describe("flatTopHexGrid", () => {
  it("uses flat-top honeycomb pitch (1.5R + gap, √3R + gap)", () => {
    const { colPitch, rowPitch, width, height } = flatTopHexGridSpacing(R, GAP);
    expect(width).toBe(2 * R);
    expect(height).toBeCloseTo(Math.sqrt(3) * R, 5);
    expect(colPitch).toBeCloseTo(1.5 * R + GAP, 5);
    expect(rowPitch).toBeCloseTo(Math.sqrt(3) * R + GAP, 5);
  });

  it("produces horizontal top and bottom edges", () => {
    const verts = flatTopHexVertices({ x: 0, y: 0 }, R);
    expect(isFlatTopHex(verts)).toBe(true);
    const ys = verts.map((v) => v.y);
    const topY = Math.max(...ys);
    const top = verts.filter((v) => Math.abs(v.y - topY) < 1e-6);
    expect(top).toHaveLength(2);
    expect(top[0]!.x).toBeCloseTo(-top[1]!.x, 5);
  });

  it("staggers odd rows by half column pitch", () => {
    const cells = layoutFlatTopHoneycomb({
      radius: R,
      gap: GAP,
      bounds: BANNER,
    });
    const { colPitch } = flatTopHexGridSpacing(R, GAP);
    const row0 = cells.filter((c) => c.row === 0);
    const row1 = cells.filter((c) => c.row === 1);
    expect(row0.length).toBeGreaterThan(0);
    expect(row1.length).toBeGreaterThan(0);
    expect(row1[0]!.center.x - row0[0]!.center.x).toBeCloseTo(colPitch / 2, 1);
  });

  it("keeps at least the configured gap between every hex pair", () => {
    const cells = layoutFlatTopHoneycomb({
      radius: R,
      gap: GAP,
      bounds: BANNER,
    });
    const result = validateFlatTopHexGrid(cells, {
      radius: R,
      gap: GAP,
      bounds: BANNER,
    });
    expect(result.ok).toBe(true);
    expect(result.minGap).toBeGreaterThanOrEqual(GAP - 3);
    expect(result.staggerPx).toBeCloseTo(flatTopHexGridSpacing(R, GAP).colPitch / 2, 1);
  });

  it("does not overlap same-row neighbors (regression for column-stack bug)", () => {
    const cells = layoutFlatTopHoneycomb({
      radius: R,
      gap: GAP,
      bounds: BANNER,
    });
    const row0 = cells
      .filter((c) => c.row === 0)
      .sort((a, b) => a.col - b.col);
    for (let i = 0; i < row0.length - 1; i++) {
      const a = flatTopHexVertices(row0[i]!.center, R - 1.2);
      const b = flatTopHexVertices(row0[i + 1]!.center, R - 1.2);
      expect(minPolygonDistance(a, b)).toBeGreaterThanOrEqual(GAP - 3);
    }
  });

  it("emits a preview SVG with hex paths", () => {
    const svg = flatTopHexGridPreviewSvg({
      radius: R,
      gap: GAP,
      bounds: BANNER,
    });
    expect(svg).toContain("<svg");
    expect(svg.match(/<path/g)?.length ?? 0).toBeGreaterThan(10);
  });

  it("lays out independent rows with per-row y and offset", () => {
    const cells = layoutFlatTopHoneycomb({
      radius: R,
      gap: GAP,
      bounds: BANNER,
      originX: 0,
      colMin: 0,
      colMax: 2,
      rows: [
        { id: 0, y: 100, originX: 0, offsetX: 0, colMin: 0, colMax: 2 },
        { id: 1, y: 280, originX: 50, offsetX: 80, colMin: 0, colMax: 2 },
      ],
    });
    const row0 = cells.filter((c) => c.row === 0);
    const row1 = cells.filter((c) => c.row === 1);
    expect(row0.every((c) => c.center.y === 100)).toBe(true);
    expect(row1.every((c) => c.center.y === 280)).toBe(true);
    const row0Col0 = row0.find((c) => c.col === 0)!;
    const row1Col0 = row1.find((c) => c.col === 0)!;
    expect(row0Col0.center.x).toBe(0);
    expect(row1Col0.center.x).toBe(50 + 80);
  });
});
