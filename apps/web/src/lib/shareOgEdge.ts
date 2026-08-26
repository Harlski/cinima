import {
  isShareOgCrawler,
  parseShareOgPath,
  shareOgApiPath,
} from "./shareOgCrawler";

export type ShareOgFetch = typeof fetch;

export function resolveShareOgApiBase(env: {
  VITE_API_BASE?: string;
  API_ORIGIN?: string;
} = {}): string {
  return (
    env.VITE_API_BASE ||
    env.API_ORIGIN ||
    "https://api.cinima.app"
  ).replace(/\/$/, "");
}

/**
 * For social crawlers on share URLs, return API Share preview HTML.
 * Returns null to fall through to the static SPA shell.
 */
export async function handleShareOgRequest(
  request: Request,
  opts: {
    apiBase: string;
    fetchImpl?: ShareOgFetch;
  }
): Promise<Response | null> {
  const ua = request.headers.get("user-agent") || "";
  if (!isShareOgCrawler(ua)) return null;

  const target = parseShareOgPath(new URL(request.url).pathname);
  if (!target) return null;

  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const upstream = await fetchImpl(`${opts.apiBase}${shareOgApiPath(target)}`, {
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
    return null;
  }
}
