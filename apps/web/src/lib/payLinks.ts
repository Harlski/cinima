import {
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  openInPayUrl,
  parseTitleId,
  payMiniAppHost,
  type MediaType,
} from "@cinima/shared";
import { isNimiqPay } from "./nimiqPay";
import { siteOrigin } from "./siteMeta";

export {
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  openInPayUrl,
  payMiniAppHost,
};

/** Origin to open inside Pay: live page in the browser, else configured site. */
export function payAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return siteOrigin;
}

/** HTTPS intent link for <a href> CTAs. */
export function payOpenHttpsUrl(origin = payAppOrigin()): string {
  return openInPayUrl(origin);
}

/** Custom-scheme deeplink (nimiqpay://…). */
export function payOpenSchemeUrl(origin = payAppOrigin()): string {
  return nimiqPayMiniAppSchemeUrl(origin);
}

/**
 * Colon-free in-app title path for Pay deep links.
 * (`/title/movie/550` — Pay / HTTPS intents break on `tmdb:movie:550` colons.)
 */
export function titleAppPath(titleId: string): string {
  const parsed = parseTitleId(titleId) ?? parseLegacyTitleId(titleId);
  if (parsed) return `/title/${parsed.mediaType}/${parsed.tmdbId}`;
  return `/title/${encodeURIComponent(titleId)}`;
}

function parseLegacyTitleId(
  id: string
): { mediaType: MediaType; tmdbId: number } | null {
  const m = /^(movie|tv):(\d+)$/.exec(id.trim());
  if (!m) return null;
  return { mediaType: m[1] as MediaType, tmdbId: Number(m[2]) };
}

/**
 * Open a title inside Cinima via Nimiq Pay.
 * When already in Pay, returns a same-origin path for in-app navigation.
 */
export function payOpenTitleUrl(titleId: string, origin = payAppOrigin()): string {
  const path = titleAppPath(titleId);
  if (isNimiqPay()) return path;
  return payOpenSchemeUrl(`${origin.replace(/\/$/, "")}${path}`);
}
