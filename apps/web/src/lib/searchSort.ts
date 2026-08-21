import type { TitleSummary } from "@cinima/shared";

export type SearchSortKey = "popularity" | "rating" | "year";

const STORAGE_KEY = "cinima.searchSort";
const SORT_KEYS = new Set<SearchSortKey>(["popularity", "rating", "year"]);
const DEFAULT_SORT: SearchSortKey = "popularity";

function sortScore(title: TitleSummary, key: SearchSortKey): number {
  const value = title[key];
  return value == null || !Number.isFinite(value) ? Number.NEGATIVE_INFINITY : value;
}

export function sortSearchResults(
  titles: TitleSummary[],
  key: SearchSortKey
): TitleSummary[] {
  return [...titles].sort((a, b) => {
    const score = sortScore(a, key) - sortScore(b, key);
    if (score !== 0) return score;
    const name = a.title.localeCompare(b.title);
    if (name !== 0) return name;
    return a.id.localeCompare(b.id);
  });
}

export function loadSearchSort(): SearchSortKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && SORT_KEYS.has(raw as SearchSortKey)) return raw as SearchSortKey;
  } catch {
    /* private mode / missing storage */
  }
  return DEFAULT_SORT;
}

export function saveSearchSort(key: SearchSortKey): SearchSortKey {
  const next = SORT_KEYS.has(key) ? key : DEFAULT_SORT;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode / missing storage */
  }
  return next;
}
