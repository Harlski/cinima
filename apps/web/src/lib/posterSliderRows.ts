/** How many posters fit across the visible strip. */
export function posterSliderColsFit(input: {
  containerWidth: number;
  posterWidth: number;
  gap: number;
}): number {
  if (input.containerWidth <= 0 || input.posterWidth <= 0) return 1;
  const gap = Math.max(0, input.gap);
  const exact = (input.containerWidth + gap) / (input.posterWidth + gap);
  // Bias up slightly so near-fit widths (e.g. 2.85 slots) keep a full top row
  // instead of wrapping early to a sparse 2+1 column strip.
  return Math.max(1, Math.floor(exact + 0.25));
}

export type PosterSliderLayout = {
  rows: number;
  cols: number;
};

/**
 * Multi-row strips fill row-major using the visible column count:
 * 4 titles with room for 3 → O O O / O
 * 3 titles with room for ~3 → O O O (one row), not O O / O
 * Overflow past rows×cols expands columns for horizontal scroll.
 */
export function posterSliderLayout(input: {
  itemCount: number;
  containerWidth: number;
  posterWidth: number;
  gap: number;
  maxRows: number;
}): PosterSliderLayout {
  const maxRows = Math.max(1, Math.floor(input.maxRows));
  const itemCount = Math.max(0, input.itemCount);
  if (itemCount <= 1 || maxRows === 1) {
    return { rows: 1, cols: Math.max(1, itemCount) };
  }
  if (input.containerWidth <= 0 || input.posterWidth <= 0) {
    return { rows: 1, cols: Math.max(1, itemCount) };
  }

  const colsFit = posterSliderColsFit(input);
  if (itemCount <= colsFit) {
    return { rows: 1, cols: itemCount };
  }

  const rows = maxRows;
  const colsNeeded = Math.ceil(itemCount / rows);
  const cols = Math.max(colsFit, colsNeeded);
  return { rows, cols };
}

/**
 * Fit-to-width grid for capped Recommends (no horizontal scroll).
 * 1–3 stay on one row; 4–6 use two rows of three equal columns.
 */
export function posterFitLayout(input: {
  itemCount: number;
  maxRows?: number;
  maxCols?: number;
}): PosterSliderLayout {
  const itemCount = Math.max(0, input.itemCount);
  const maxRows = Math.max(1, Math.floor(input.maxRows ?? 2));
  const maxCols = Math.max(1, Math.floor(input.maxCols ?? 3));
  if (itemCount <= 0) return { rows: 1, cols: 1 };
  if (itemCount <= maxCols) return { rows: 1, cols: itemCount };
  return {
    rows: Math.min(maxRows, Math.ceil(itemCount / maxCols)),
    cols: maxCols,
  };
}

/** 1-based grid slot for row-major packing. */
export function posterSliderItemSlot(
  index: number,
  cols: number
): { row: number; col: number } {
  const safeCols = Math.max(1, Math.floor(cols));
  return {
    row: Math.floor(index / safeCols) + 1,
    col: (index % safeCols) + 1,
  };
}
