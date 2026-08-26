import type { MediaType } from "./ids.js";

/** Handles that must not resolve as public profile URLs. */
export const RESERVED_PUBLIC_HANDLES = new Set([
  "gate",
  "discover",
  "my-list",
  "search",
  "activity",
  "me",
  "title",
  "user",
  "api",
  "health",
  "s",
]);

export function shortSharePath(code: string): string {
  return `/s/${code.trim().toLowerCase()}`;
}

export function shortShareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}${shortSharePath(code)}`;
}

export function profileSharePath(handle: string): string {
  return `/${handle.trim().toLowerCase()}`;
}

export function profileShareUrl(origin: string, handle: string): string {
  return `${origin.replace(/\/$/, "")}${profileSharePath(handle)}`;
}

export function profileShareCopy(handle: string): string {
  return `${handle} on Cinima`;
}

export function profileShareDescription(handle: string): string {
  return `Check out ${handle}'s favorite movies & tv shows on Cinima.app`;
}

export function titleSharePath(
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): string {
  return `/${handle.trim().toLowerCase()}/t/${mediaType}/${tmdbId}`;
}

export function titleShareUrl(
  origin: string,
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): string {
  return `${origin.replace(/\/$/, "")}${titleSharePath(handle, mediaType, tmdbId)}`;
}

export function titleShareCopy(handle: string, title: string): string {
  return `${handle} wants you to check out ${title}`;
}
