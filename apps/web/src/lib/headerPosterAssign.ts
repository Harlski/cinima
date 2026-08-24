import type { FlatTopHexCell } from "./flatTopHexGrid";

export type PosterPick = {
  id: string;
  posterPath: string;
  src: string;
};

export function cellKey(cell: Pick<FlatTopHexCell, "row" | "col">): string {
  return `${cell.row}:${cell.col}`;
}

/**
 * Assign posters so selected cells never share a posterPath.
 * Remaining (unselected) cells may reuse leftover posters.
 */
export function assignHeaderPosters(args: {
  cells: readonly FlatTopHexCell[];
  selectedKeys: ReadonlySet<string>;
  posters: readonly PosterPick[];
}): Map<string, PosterPick> {
  const { cells, selectedKeys, posters } = args;
  const out = new Map<string, PosterPick>();
  if (!posters.length) return out;

  const selected = cells.filter((c) => selectedKeys.has(cellKey(c)));
  const unselected = cells.filter((c) => !selectedKeys.has(cellKey(c)));

  const used = new Set<string>();
  let next = 0;
  for (const cell of selected) {
    let pick: PosterPick | undefined;
    for (let tries = 0; tries < posters.length; tries++) {
      const candidate = posters[next % posters.length]!;
      next++;
      if (!used.has(candidate.posterPath)) {
        pick = candidate;
        used.add(candidate.posterPath);
        break;
      }
    }
    // Pool exhausted: fall back to cycling (duplicates only when forced).
    out.set(cellKey(cell), pick ?? posters[next++ % posters.length]!);
  }

  for (const cell of unselected) {
    out.set(cellKey(cell), posters[next++ % posters.length]!);
  }

  return out;
}

export function selectedPosterPathsAreUnique(
  cells: readonly FlatTopHexCell[],
  selectedKeys: ReadonlySet<string>,
  assigned: ReadonlyMap<string, PosterPick>
): boolean {
  const paths = new Set<string>();
  for (const cell of cells) {
    const key = cellKey(cell);
    if (!selectedKeys.has(key)) continue;
    const pick = assigned.get(key);
    if (!pick) return false;
    if (paths.has(pick.posterPath)) return false;
    paths.add(pick.posterPath);
  }
  return true;
}
