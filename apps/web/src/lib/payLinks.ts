import {
  nimiqPayMiniAppHttpsUrl,
  nimiqPayMiniAppSchemeUrl,
  openInPayUrl,
  payMiniAppHost,
} from "@cinima/shared";
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
