/**
 * Nimiq identicons for wallet addresses.
 * Import the ESM bundle entry explicitly — the package `browser` field points at
 * `identicons.min.js`, which does not embed sprites. Set IdenticonsAssets on
 * globalThis so faces render fully under Vite.
 */
import Identicons, { IdenticonsAssets } from "@nimiq/identicons/dist/identicons.bundle.min.js";
import { formatWallet } from "@cinima/shared";

type IdenticonsGlobal = typeof globalThis & { IdenticonsAssets?: string };
const g = globalThis as IdenticonsGlobal;
if (g.IdenticonsAssets === undefined) {
  g.IdenticonsAssets = IdenticonsAssets;
}

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** SVG data URL suitable for `<img src>`. */
export async function identiconDataUrl(address: string): Promise<string> {
  const formatted = formatWallet(address);
  if (!formatted) return "";
  const key = formatted.toUpperCase();
  const hit = cache.get(key);
  if (hit) return hit;
  let p = pending.get(key);
  if (!p) {
    p = Identicons.toDataUrl(formatted)
      .then((url: string) => {
        cache.set(key, url);
        pending.delete(key);
        return url;
      })
      .catch((err: unknown) => {
        pending.delete(key);
        throw err;
      });
    pending.set(key, p);
  }
  return p;
}
