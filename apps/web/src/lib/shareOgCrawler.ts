import { RESERVED_PUBLIC_HANDLES } from "@cinima/shared";

/** Social crawlers that need Open Graph HTML instead of the SPA shell. */
export function isShareOgCrawler(userAgent: string): boolean {
  return /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|TelegramBot|LinkedInBot|Discordbot|Pinterest/i.test(
    userAgent
  );
}

/** @deprecated Use isShareOgCrawler */
export const isTitleShareCrawler = isShareOgCrawler;

export const SHORT_SHARE_PATH = /^\/s\/([a-z0-9]{6,12})\/?$/;

export const TITLE_SHARE_PATH = /^\/([^/]+)\/t\/(movie|tv)\/(\d+)\/?$/;

export const PROFILE_SHARE_PATH = /^\/([^/]+)\/?$/;

export type ShareOgTarget =
  | { type: "short"; code: string }
  | { type: "title"; handle: string; mediaType: "movie" | "tv"; tmdbId: string }
  | { type: "profile"; handle: string };

export function parseShareOgPath(path: string): ShareOgTarget | null {
  const shortMatch = SHORT_SHARE_PATH.exec(path);
  if (shortMatch?.[1]) {
    return { type: "short", code: shortMatch[1] };
  }

  const titleMatch = TITLE_SHARE_PATH.exec(path);
  if (titleMatch) {
    const [, handle, mediaType, tmdbId] = titleMatch;
    if (!handle || RESERVED_PUBLIC_HANDLES.has(handle.toLowerCase())) return null;
    if (mediaType !== "movie" && mediaType !== "tv") return null;
    return { type: "title", handle, mediaType, tmdbId: tmdbId! };
  }

  const profileMatch = PROFILE_SHARE_PATH.exec(path);
  if (!profileMatch) return null;
  const handle = profileMatch[1];
  if (!handle || RESERVED_PUBLIC_HANDLES.has(handle.toLowerCase())) return null;
  return { type: "profile", handle };
}
