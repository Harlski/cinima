import { normalizeWallet } from "@cinima/shared";
import { config } from "../lib/config.js";

/**
 * Soft NimConnect integration.
 * Known APIs vary; we try a few common patterns and fall back to null.
 */
export async function lookupHandleByWallet(wallet: string): Promise<string | null> {
  const w = normalizeWallet(wallet);
  const bases = [config.nimConnectBaseUrl];
  const paths = [
    `/api/v1/users/by-address/${w}`,
    `/api/users/${w}`,
    `/v1/address/${w}`,
  ];

  for (const base of bases) {
    for (const path of paths) {
      try {
        const res = await fetch(`${base}${path}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        const handle =
          (data.handle as string) ||
          (data.username as string) ||
          (data.name as string) ||
          ((data.user as { handle?: string } | undefined)?.handle ?? null);
        if (handle) return String(handle).replace(/^@/, "").toLowerCase();
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

export async function lookupWalletByHandle(handle: string): Promise<string | null> {
  const h = handle.replace(/^@/, "").trim().toLowerCase();
  const paths = [`/api/v1/users/${h}`, `/api/users/${h}`, `/v1/user/${h}`];
  for (const path of paths) {
    try {
      const res = await fetch(`${config.nimConnectBaseUrl}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      const addr =
        (data.address as string) ||
        (data.wallet as string) ||
        (data.walletAddress as string) ||
        ((data.user as { address?: string } | undefined)?.address ?? null);
      if (addr) return normalizeWallet(addr);
    } catch {
      /* try next */
    }
  }
  return null;
}
