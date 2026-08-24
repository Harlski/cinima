import type { TitleSummary } from "@cinima/shared";

const STORAGE_KEY = "cinima.searchTitleLookups";
const MAX_LOOKUPS = 3;

export type TitleLookup = Pick<
  TitleSummary,
  "id" | "title" | "posterUrl" | "mediaType" | "year"
>;

let memory: TitleLookup[] = [];

function canUseLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readStore(): TitleLookup[] {
  if (!canUseLocalStorage()) return [...memory];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TitleLookup[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function writeStore(items: TitleLookup[]): TitleLookup[] {
  const next = items.slice(0, MAX_LOOKUPS);
  memory = next;
  if (canUseLocalStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function loadTitleLookups(): TitleLookup[] {
  return readStore().slice(0, MAX_LOOKUPS);
}

/** Most recent first. Dedupes by title id. */
export function pushTitleLookup(title: TitleLookup): TitleLookup[] {
  const next = [
    {
      id: title.id,
      title: title.title,
      posterUrl: title.posterUrl,
      mediaType: title.mediaType,
      year: title.year,
    },
    ...readStore().filter((item) => item.id !== title.id),
  ];
  return writeStore(next);
}

export function clearTitleLookups(): TitleLookup[] {
  memory = [];
  if (canUseLocalStorage()) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}
