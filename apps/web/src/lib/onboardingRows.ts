/** Split a flat candidate list into `rowCount` independent slider rows (round-robin). */
export function splitIntoRows<T>(items: readonly T[], rowCount: number): T[][] {
  if (rowCount <= 0) return [];
  const rows: T[][] = Array.from({ length: rowCount }, () => []);
  for (let i = 0; i < items.length; i++) {
    rows[i % rowCount]!.push(items[i]!);
  }
  return rows;
}
