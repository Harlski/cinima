import type { MediaType } from "./ids.js";

/** Branded Share preview image size (Facebook / Open Graph large card). */
export const SHARE_OG_IMAGE_WIDTH = 1200;
export const SHARE_OG_IMAGE_HEIGHT = 630;

/** Branded Share preview image served by the API. */
export function profileShareOgImageUrl(apiOrigin: string, handle: string): string {
  return `${apiOrigin.replace(/\/$/, "")}/api/og/profile/${encodeURIComponent(handle)}.png`;
}

export function titleShareOgImageUrl(
  apiOrigin: string,
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): string {
  return `${apiOrigin.replace(/\/$/, "")}/api/og/title/${encodeURIComponent(handle)}/${mediaType}/${tmdbId}.png`;
}
