const STORAGE_KEY = "nimcharts.searchHistory";
const MAX_ITEMS = 12;

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function loadSearchHistory(): string[] {
  return read();
}

export function pushSearchHistory(query: string): string[] {
  const q = query.trim();
  if (!q) return read();
  const next = [
    q,
    ...read().filter((item) => item.toLowerCase() !== q.toLowerCase()),
  ].slice(0, MAX_ITEMS);
  write(next);
  return next;
}

export function removeSearchHistoryItem(query: string): string[] {
  const next = read().filter(
    (item) => item.toLowerCase() !== query.trim().toLowerCase()
  );
  write(next);
  return next;
}

export function clearSearchHistory(): string[] {
  localStorage.removeItem(STORAGE_KEY);
  return [];
}
