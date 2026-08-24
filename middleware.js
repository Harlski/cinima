/**
 * Vercel Edge Middleware: social crawlers get API OG HTML for share URLs
 * instead of the SPA shell. Keep UA/path rules aligned with
 * apps/web/src/lib/shareOgCrawler.ts.
 */

const RESERVED = new Set([
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

const SHORT = /^\/s\/([a-z0-9]{6,12})\/?$/;
const TITLE = /^\/([^/]+)\/t\/(movie|tv)\/(\d+)\/?$/;
const PROFILE = /^\/([^/]+)\/?$/;

function isShareOgCrawler(userAgent) {
  return /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Slackbot|TelegramBot|LinkedInBot|Discordbot|Pinterest/i.test(
    userAgent
  );
}

function parseShareOgPath(path) {
  const shortMatch = SHORT.exec(path);
  if (shortMatch?.[1]) return { type: "short", code: shortMatch[1] };

  const titleMatch = TITLE.exec(path);
  if (titleMatch) {
    const handle = titleMatch[1];
    const mediaType = titleMatch[2];
    const tmdbId = titleMatch[3];
    if (!handle || RESERVED.has(handle.toLowerCase())) return null;
    return { type: "title", handle, mediaType, tmdbId };
  }

  const profileMatch = PROFILE.exec(path);
  if (!profileMatch) return null;
  const handle = profileMatch[1];
  if (!handle || RESERVED.has(handle.toLowerCase())) return null;
  return { type: "profile", handle };
}

function shareOgApiPath(target) {
  if (target.type === "short") {
    return `/api/s/${encodeURIComponent(target.code)}`;
  }
  if (target.type === "title") {
    return `/api/public/${encodeURIComponent(target.handle)}/t/${target.mediaType}/${target.tmdbId}`;
  }
  return `/api/public/${encodeURIComponent(target.handle)}`;
}

function apiBase() {
  return (
    process.env.VITE_API_BASE ||
    process.env.API_ORIGIN ||
    "https://api.cinima.app"
  ).replace(/\/$/, "");
}

export const config = {
  matcher: ["/s/:code", "/:handle", "/:handle/t/:mediaType/:tmdbId"],
};

export default async function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (!isShareOgCrawler(ua)) return;

  const url = new URL(request.url);
  const target = parseShareOgPath(url.pathname);
  if (!target) return;

  try {
    const upstream = await fetch(`${apiBase()}${shareOgApiPath(target)}`, {
      headers: { Accept: "text/html" },
    });
    const html = await upstream.text();
    return new Response(html, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return;
  }
}
