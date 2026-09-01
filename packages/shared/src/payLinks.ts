/**
 * Nimiq Pay mini app intent links (nimiq.dev/mini-apps "Sharing Your Mini App").
 *
 * Custom scheme:  nimiqpay://miniapp?url=your-app.com
 * HTTPS intent:   https://nimpay.app/miniapps/open/your-app.com
 *
 * Deep links use a full absolute URL in the scheme `url` param. Path `/` and
 * `:` must stay unencoded — Pay opens the mini app but drops the page when
 * slashes are `%2F` (manual open of the decoded URL works).
 */

function apexHostname(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

function parseAppUrl(originOrUrl: string): URL | null {
  const raw = originOrUrl.trim().replace(/\/$/, "");
  if (!raw) return null;
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)
      ? raw
      : `https://${raw}`;
    const u = new URL(withScheme);
    u.hostname = apexHostname(u.hostname);
    return u;
  } catch {
    return null;
  }
}

/** Public origin with trailing slash and leading www. dropped. */
export function canonicalWebOrigin(origin: string): string {
  const raw = origin.trim();
  if (!raw) return raw;
  const u = parseAppUrl(raw);
  return u ? u.origin : raw.replace(/\/$/, "");
}

/** Host form used in HTTPS intent links (no scheme; keeps port and non-root path). */
export function payMiniAppHost(originOrUrl: string): string {
  const u = parseAppUrl(originOrUrl);
  if (!u) {
    return originOrUrl.trim().replace(/\/$/, "").replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  }
  const path = u.pathname.replace(/\/$/, "");
  return path ? `${u.host}${path}` : u.host;
}

/**
 * Value for `nimiqpay://miniapp?url=…`.
 * Bare origin → `host[:port]` (docs / listed apps).
 * Path or query → absolute `http(s)://…` so Pay can load the deep link.
 */
export function payMiniAppSchemeTarget(originOrUrl: string): string {
  const u = parseAppUrl(originOrUrl);
  if (!u) return payMiniAppHost(originOrUrl);
  const path = u.pathname.replace(/\/$/, "");
  const hasDeepLink = Boolean(path) || Boolean(u.search) || Boolean(u.hash);
  if (hasDeepLink) {
    return `${u.protocol}//${u.host}${path}${u.search}${u.hash}`;
  }
  return u.host;
}

/**
 * Encode for the scheme `url` query value, but leave `:` and `/` literal.
 * Full encodeURIComponent breaks Pay deep links (`%2F` in the path).
 */
export function encodeMiniAppUrlQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%3A/gi, ":").replace(/%2F/gi, "/");
}

/** Custom URI scheme — opens Nimiq Pay when the OS handles nimiqpay://. */
export function nimiqPayMiniAppSchemeUrl(originOrUrl: string): string {
  return `nimiqpay://miniapp?url=${encodeMiniAppUrlQueryValue(payMiniAppSchemeTarget(originOrUrl))}`;
}

/** HTTPS intent — preferred for web CTAs; opens the mini app the same way. */
export function nimiqPayMiniAppHttpsUrl(originOrUrl: string): string {
  return `https://nimpay.app/miniapps/open/${payMiniAppHost(originOrUrl)}`;
}

/** Default share / CTA target (HTTPS intent). */
export function openInPayUrl(originOrUrl: string): string {
  return nimiqPayMiniAppHttpsUrl(originOrUrl);
}
