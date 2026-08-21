/** 1 row when titles fit; otherwise `maxRows` (a second strip, not N-1 in between). */
export function posterSliderRowCount(input: {
  itemCount: number;
  containerWidth: number;
  posterWidth: number;
  gap: number;
  maxRows: number;
}): number {
  const maxRows = Math.max(1, Math.floor(input.maxRows));
  if (input.itemCount <= 1 || maxRows === 1) return 1;
  if (input.containerWidth <= 0 || input.posterWidth <= 0) return 1;

  const gap = Math.max(0, input.gap);
  const oneRowWidth =
    input.itemCount * input.posterWidth + (input.itemCount - 1) * gap;
  return oneRowWidth > input.containerWidth + 0.5 ? maxRows : 1;
}
