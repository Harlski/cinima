import { Filter } from "bad-words";

const filter = new Filter();

export function censorProfanity(text: string): string {
  return filter.clean(text);
}

/**
 * True when text contains a blocked word.
 * Underscores / digits are treated as separators so handles like
 * `shit_head` or `asshole99` are rejected (word-boundary alone would miss them).
 */
export function containsProfanity(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (filter.isProfane(normalized)) return true;

  const softened = normalized.replace(/[0-9_]+/g, " ").replace(/\s+/g, " ").trim();
  if (softened && filter.isProfane(softened)) return true;

  for (const part of normalized.split(/[0-9_]+/)) {
    if (part.length >= 2 && filter.isProfane(part)) return true;
  }
  return false;
}
