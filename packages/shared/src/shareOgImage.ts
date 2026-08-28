import type { MediaType } from "./ids.js";

/** Branded Share preview image size (Facebook / Open Graph large card). */
export const SHARE_OG_IMAGE_WIDTH = 1200;
export const SHARE_OG_IMAGE_HEIGHT = 630;

/**
 * Standard large-card size used by X (summary_large_image), Facebook, LinkedIn, Slack, etc.
 * Keep og:image width/height meta tags in sync with these values.
 */

/** Branded Share preview PNG URL on the public site (proxied to the API in production). */
export function profileShareOgImageUrl(siteOrigin: string, handle: string): string {
  return `${siteOrigin.replace(/\/$/, "")}/api/og/profile/${encodeURIComponent(handle)}.png`;
}

export function titleShareOgImageUrl(
  siteOrigin: string,
  handle: string,
  mediaType: MediaType,
  tmdbId: number
): string {
  return `${siteOrigin.replace(/\/$/, "")}/api/og/title/${encodeURIComponent(handle)}/${mediaType}/${tmdbId}.png`;
}
