import type { MediaType } from "./ids.js";

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

export function xShareUrl(url: string, text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

export function facebookShareUrl(url: string, text: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
}
