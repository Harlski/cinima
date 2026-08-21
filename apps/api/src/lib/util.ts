import { normalizeWallet } from "@nimcharts/shared";

/** Detect Nimiq Pay host injection or explicit demo query from Referer / X-Demo header */
export function isPayContext(headers: Headers, queryDemo?: string | null): boolean {
  if (queryDemo === "1" || queryDemo === "true") return true;
  if (headers.get("x-nimcharts-pay") === "1") return true;
  if (headers.get("x-nimcharts-demo") === "1") return true;
  const ua = headers.get("user-agent") || "";
  if (/NimiqPay/i.test(ua)) return true;
  return false;
}

export function bearerToken(headers: Headers): string | null {
  const auth = headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1]!.trim() : null;
}

export { normalizeWallet };
