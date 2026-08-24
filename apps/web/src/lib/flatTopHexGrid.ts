/**
 * Flat-top hex honeycomb layout (flat edges on top and bottom).
 * Spacing follows Red Blob Games flat-top offset grid with uniform gap.
 */

export type Point = { x: number; y: number };

export type FlatTopHexCell = {
  row: number;
  col: number;
  center: Point;
};

export type FlatTopHexRowConfig = {
  /** Row index (label only; layout uses y/origin, not lattice math). */
  id: number;
  /** Vertical center of every hex in this row. */
  y: number;
  /** When false, row is hidden from layout. */
  enabled?: boolean;
  /** Row-specific start X for col 0 (defaults to grid originX). */
  originX?: number;
  /** Extra horizontal shift applied after origin + col pitch. */
  offsetX?: number;
  /** Row-specific col pitch (defaults to grid colPitch). */
  colPitch?: number;
  colMin?: number;
  colMax?: number;
};

export type FlatTopHexGridOptions = {
  /** Center-to-vertex radius */
  radius: number;
  /** Clear space between hex edges (same units as radius) */
  gap: number;
  bounds: { width: number; height: number };
  /** Per-row layout; when set, rows are independent of lattice formula. */
  rows?: FlatTopHexRowConfig[];
  /** How many extra rows/cols to bleed past bounds (lattice mode only) */
  bleedRows?: number;
  bleedCols?: number;
  /** Grid origin (defaults centre honeycomb band on bounds) */
  originX?: number;
  originY?: number;
  /** Override center pitch; defaults to 1.5·radius + gap */
  colPitch?: number;
  /** Override row pitch; defaults to √3·radius + gap */
  rowPitch?: number;
  /** Odd-row horizontal shift; defaults to colPitch / 2 (lattice mode only) */
  rowStagger?: number;
  rowMin?: number;
  rowMax?: number;
  colMin?: number;
  colMax?: number;
};

export type FlatTopHexMetrics = {
  width: number;
  height: number;
  colPitch: number;
  rowPitch: number;
};

export type ResolvedFlatTopHexMetrics = FlatTopHexMetrics & {
  rowStagger: number;
};

/** Width, height, and center pitches for a gapped flat-top honeycomb. */
export function flatTopHexGridSpacing(
  radius: number,
  gap: number
): FlatTopHexMetrics {
  return {
    width: 2 * radius,
    height: Math.sqrt(3) * radius,
    colPitch: 1.5 * radius + gap,
    rowPitch: Math.sqrt(3) * radius + gap,
  };
}

/** Resolve auto pitches and stagger from options (manual overrides supported). */
export function resolveFlatTopHexGridMetrics(
  opts: FlatTopHexGridOptions
): ResolvedFlatTopHexMetrics {
  const auto = flatTopHexGridSpacing(opts.radius, opts.gap);
  const colPitch = opts.colPitch ?? auto.colPitch;
  const rowPitch = opts.rowPitch ?? auto.rowPitch;
  const rowStagger = opts.rowStagger ?? colPitch / 2;
  return {
    width: auto.width,
    height: auto.height,
    colPitch,
    rowPitch,
    rowStagger,
  };
}

/** Six vertices for a flat-top hex (0° vertex points east). */
export function flatTopHexVertices(center: Point, radius: number): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push({
      x: center.x + radius * Math.cos(a),
      y: center.y + radius * Math.sin(a),
    });
  }
  return pts;
}

/** True when the hex has horizontal top and bottom edges. */
export function isFlatTopHex(vertices: Point[]): boolean {
  if (vertices.length !== 6) return false;
  const ys = vertices.map((v) => v.y);
  const topY = Math.max(...ys);
  const bottomY = Math.min(...ys);
  const top = vertices.filter((v) => Math.abs(v.y - topY) < 1e-6);
  const bottom = vertices.filter((v) => Math.abs(v.y - bottomY) < 1e-6);
  if (top.length !== 2 || bottom.length !== 2) return false;
  return (
    Math.abs(top[0]!.y - top[1]!.y) < 1e-6 &&
    Math.abs(bottom[0]!.y - bottom[1]!.y) < 1e-6 &&
    Math.abs(top[0]!.x - top[1]!.x) > 1e-6
  );
}

/** Build default independent rows from lattice parameters. */
export function defaultFlatTopHexRows(
  opts: FlatTopHexGridOptions
): FlatTopHexRowConfig[] {
  const { colPitch, rowPitch, rowStagger } =
    resolveFlatTopHexGridMetrics(opts);
  const bleedRows = opts.bleedRows ?? 2;
  const rowMin = opts.rowMin ?? -bleedRows;
  const rowMax = opts.rowMax ?? bleedRows + 2;
  const originY =
    opts.originY ?? opts.bounds.height / 2 - rowPitch / 2;
  const originX = opts.originX ?? -opts.radius * 0.25;

  const rows: FlatTopHexRowConfig[] = [];
  for (let row = rowMin; row <= rowMax; row++) {
    rows.push({
      id: row,
      y: originY + row * rowPitch,
      originX,
      offsetX: row & 1 ? rowStagger : 0,
    });
  }
  return rows;
}

function layoutIndependentRows(opts: FlatTopHexGridOptions): FlatTopHexCell[] {
  const rows = opts.rows ?? [];
  const global = resolveFlatTopHexGridMetrics(opts);
  const colPitch = opts.colPitch ?? global.colPitch;
  const defaultOriginX = opts.originX ?? -opts.radius * 0.25;
  const bleedCols = opts.bleedCols ?? 1;
  const colMin = opts.colMin ?? -bleedCols;
  const colsNeeded =
    Math.ceil((opts.bounds.width - defaultOriginX) / colPitch) + bleedCols + 1;
  const defaultColMax = opts.colMax ?? colsNeeded;

  const cells: FlatTopHexCell[] = [];
  for (const row of rows) {
    if (row.enabled === false) continue;
    const rowColPitch = row.colPitch ?? colPitch;
    const rowOriginX = row.originX ?? defaultOriginX;
    const rowOffsetX = row.offsetX ?? 0;
    // Ensure each independent row always covers the full banner width,
    // even with large origin/offset customizations.
    const rowColsNeededLeft =
      Math.ceil((rowOriginX + rowOffsetX) / rowColPitch) + bleedCols + 1;
    const rowAutoMin = -rowColsNeededLeft;
    const rowColMin = Math.min(colMin, row.colMin ?? colMin, rowAutoMin);
    const rowColsNeeded =
      Math.ceil((opts.bounds.width - rowOriginX - rowOffsetX) / rowColPitch) +
      bleedCols +
      1;
    const rowAutoMax = Math.max(defaultColMax, rowColsNeeded);
    const rowColMax =
      row.colMax != null ? Math.max(row.colMax, rowAutoMax) : rowAutoMax;

    for (let col = rowColMin; col <= rowColMax; col++) {
      cells.push({
        row: row.id,
        col,
        center: {
          x: rowOriginX + col * rowColPitch + rowOffsetX,
          y: row.y,
        },
      });
    }
  }
  return cells;
}

/** Odd-r flat-top honeycomb, or independent rows when opts.rows is set. */
export function layoutFlatTopHoneycomb(
  opts: FlatTopHexGridOptions
): FlatTopHexCell[] {
  if (opts.rows?.length) {
    return layoutIndependentRows(opts);
  }

  const { colPitch, rowPitch, rowStagger } =
    resolveFlatTopHexGridMetrics(opts);
  const bleedRows = opts.bleedRows ?? 2;
  const bleedCols = opts.bleedCols ?? 1;

  const originY =
    opts.originY ?? opts.bounds.height / 2 - rowPitch / 2;
  const originX = opts.originX ?? -opts.radius * 0.25;

  const colsNeeded =
    Math.ceil((opts.bounds.width - originX) / colPitch) + bleedCols + 1;
  const rowMin = opts.rowMin ?? -bleedRows;
  const rowMax = opts.rowMax ?? bleedRows + 2;
  const colMin = opts.colMin ?? -bleedCols;
  const colMax = opts.colMax ?? colsNeeded;

  const cells: FlatTopHexCell[] = [];
  for (let row = rowMin; row <= rowMax; row++) {
    for (let col = colMin; col <= colMax; col++) {
      const x = originX + col * colPitch + (row & 1 ? rowStagger : 0);
      const y = originY + row * rowPitch;
      cells.push({ row, col, center: { x, y } });
    }
  }
  return cells;
}

function distPointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

function distSegmentToSegment(a1: Point, a2: Point, b1: Point, b2: Point): number {
  return Math.min(
    distPointToSegment(a1, b1, b2),
    distPointToSegment(a2, b1, b2),
    distPointToSegment(b1, a1, a2),
    distPointToSegment(b2, a1, a2)
  );
}

/** Minimum distance between edges/vertices of two convex polygons. */
export function minPolygonDistance(a: Point[], b: Point[]): number {
  let min = Infinity;
  for (const p of a) {
    for (const q of b) {
      min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
    }
  }
  for (let i = 0; i < a.length; i++) {
    const a1 = a[i]!;
    const a2 = a[(i + 1) % a.length]!;
    for (let j = 0; j < b.length; j++) {
      const b1 = b[j]!;
      const b2 = b[(j + 1) % b.length]!;
      min = Math.min(min, distSegmentToSegment(a1, a2, b1, b2));
    }
  }
  return min;
}

export type HexGridValidation = {
  ok: boolean;
  minGap: number;
  worstPair: [number, number] | null;
  staggerPx: number;
};

/** Validate orientation, stagger, and minimum gap between all hex pairs. */
export function validateFlatTopHexGrid(
  cells: FlatTopHexCell[],
  opts: FlatTopHexGridOptions,
  inset = 1.2
): HexGridValidation {
  const { colPitch, rowStagger } = resolveFlatTopHexGridMetrics(opts);
  const r = opts.radius - inset;

  if (!cells.length) {
    return { ok: false, minGap: 0, worstPair: null, staggerPx: rowStagger };
  }

  const sample = flatTopHexVertices(cells[0]!.center, r);
  if (!isFlatTopHex(sample)) {
    return { ok: false, minGap: 0, worstPair: null, staggerPx: rowStagger };
  }

  const row0 = cells.filter((c) => c.row === 0);
  const row1 = cells.filter((c) => c.row === 1);
  const independent = Boolean(opts.rows?.length);
  const staggerPx =
    !independent && row0.length && row1.length
      ? Math.abs(row1[0]!.center.x - row0[0]!.center.x)
      : 0;

  let minGap = Infinity;
  let worstPair: [number, number] | null = null;
  const polys = cells.map((c) => flatTopHexVertices(c.center, r));

  for (let i = 0; i < polys.length; i++) {
    for (let j = i + 1; j < polys.length; j++) {
      const d = minPolygonDistance(polys[i]!, polys[j]!);
      if (d < minGap) {
        minGap = d;
        worstPair = [i, j];
      }
    }
  }

  const staggerOk =
    independent || Math.abs(staggerPx - rowStagger) <= 0.5;
  const ok = staggerOk && minGap >= opts.gap - 3;
  return { ok, minGap, worstPair, staggerPx };
}

export function flatTopHexSvgPath(center: Point, radius: number): string {
  const pts = flatTopHexVertices(center, radius);
  return (
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ") + " Z"
  );
}

/** Wireframe SVG for validating grid geometry (matches reference pattern). */
export function flatTopHexGridPreviewSvg(
  opts: FlatTopHexGridOptions,
  stroke = "#000000",
  fill = "#ffffff",
  background = "#ffffff"
): string {
  const cells = layoutFlatTopHoneycomb(opts);
  const { width, height } = opts.bounds;
  const r = opts.radius - 1.2;
  const paths = cells
    .map((c) => `<path d="${flatTopHexSvgPath(c.center, r)}" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`)
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${background}"/>
  ${paths}
</svg>`;
}
