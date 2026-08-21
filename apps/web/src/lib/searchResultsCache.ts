import type { TitleSummary } from "@cinima/shared";

const MAX_QUERIES = 12;

const cache = new Map<string, TitleSummary[]>();

function cacheKey(query: string): string {
  return query.trim();
}

export function saveSearchResults(
  query: string,
  results: TitleSummary[]
): void {
  const key = cacheKey(query);
  if (!key) return;
  cache.delete(key);
  cache.set(key, results);
  while (cache.size > MAX_QUERIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function loadSearchResults(query: string): TitleSummary[] | null {
  const key = cacheKey(query);
  if (!key) return null;
  return cache.get(key) ?? null;
}

export function clearSearchResultsCache(): void {
  cache.clear();
}
