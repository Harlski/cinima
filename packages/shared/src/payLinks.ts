/**
 * Nimiq Pay mini app intent links (nimiq.dev/mini-apps "Sharing Your Mini App").
 *
 * Custom scheme:  nimiqpay://miniapp?url=your-app.com
 * HTTPS intent:   https://nimpay.app/miniapps/open/your-app.com
 */

/** Host form used in intent links (no scheme; keeps port and non-root path). */
export function payMiniAppHost(originOrUrl: string): string {
  const raw = originOrUrl.trim().replace(/\/$/, "");
  if (!raw) return "";
  try {
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)
      ? raw
      : `https://${raw}`;
    const u = new URL(withScheme);
    const path = u.pathname.replace(/\/$/, "");
    return path ? `${u.host}${path}` : u.host;
  } catch {
    return raw.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  }
}

/** Custom URI scheme — opens Nimiq Pay when the OS handles nimiqpay://. */
export function nimiqPayMiniAppSchemeUrl(originOrUrl: string): string {
  return `nimiqpay://miniapp?url=${encodeURIComponent(payMiniAppHost(originOrUrl))}`;
}

/** HTTPS intent — preferred for web CTAs; opens the mini app the same way. */
export function nimiqPayMiniAppHttpsUrl(originOrUrl: string): string {
  return `https://nimpay.app/miniapps/open/${payMiniAppHost(originOrUrl)}`;
}

/** Default share / CTA target (HTTPS intent). */
export function openInPayUrl(originOrUrl: string): string {
  return nimiqPayMiniAppHttpsUrl(originOrUrl);
}
