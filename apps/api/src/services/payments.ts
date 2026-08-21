import {
  COMMENT_LUNA,
  LIFETIME_UNLOCK_LUNA,
  UNLOCK_LUNA,
  normalizeWallet,
  parseMemo,
} from "@nimcharts/shared";
import { config } from "../lib/config.js";

export type VerifiedTx = {
  hash: string;
  from: string;
  to: string;
  valueLuna: number;
  memo: string;
};

/**
 * Verify a payment against Nimiq RPC / explorer.
 * In DEMO_MODE, accepts synthetic hashes prefixed with `demo:` without RPC.
 */
export async function verifyPayment(opts: {
  txHash: string;
  expectedMemoType: "unlock" | "comment" | "lifetime" | "thanks";
  expectedTitleId?: string;
  expectedTo?: string;
  minLuna?: number;
  payerWallet: string;
}): Promise<VerifiedTx> {
  const hash = String(opts.txHash ?? "").trim();
  if (!hash) throw new Error("missing_tx_hash");

  if (config.demoMode && (hash.startsWith("demo:") || hash.startsWith("dev:"))) {
    const memo =
      opts.expectedMemoType === "lifetime"
        ? "lifetime"
        : opts.expectedMemoType === "thanks"
          ? `thanks:${normalizeWallet(opts.expectedTo || "")}`
          : `${opts.expectedMemoType}:${opts.expectedTitleId}`;
    const value =
      opts.minLuna ??
      (opts.expectedMemoType === "unlock"
        ? UNLOCK_LUNA
        : opts.expectedMemoType === "comment"
          ? COMMENT_LUNA
          : opts.expectedMemoType === "lifetime"
            ? LIFETIME_UNLOCK_LUNA
            : 1);
    return {
      hash,
      from: normalizeWallet(opts.payerWallet),
      to: normalizeWallet(opts.expectedTo || config.treasuryAddress),
      valueLuna: value,
      memo,
    };
  }

  const tx = await fetchTx(hash);
  if (!tx) throw new Error("tx_not_found");

  const to = normalizeWallet(tx.to);
  const from = normalizeWallet(tx.from);
  const memo = tx.memo || "";
  const parsed = parseMemo(memo);

  if (normalizeWallet(opts.payerWallet) && from !== normalizeWallet(opts.payerWallet)) {
    // Soft check — some explorers omit from until confirmed
  }

  if (opts.expectedMemoType === "thanks") {
    const tipTo = normalizeWallet(opts.expectedTo || "");
    if (tipTo && to !== tipTo) throw new Error("wrong_tip_recipient");
  } else {
    if (to !== normalizeWallet(config.treasuryAddress)) throw new Error("wrong_treasury");
  }

  if (!parsed || parsed.type !== opts.expectedMemoType) throw new Error("memo_mismatch");
  if (
    (parsed.type === "unlock" || parsed.type === "comment") &&
    opts.expectedTitleId &&
    parsed.titleId !== opts.expectedTitleId
  ) {
    throw new Error("title_mismatch");
  }
  if (parsed.type === "thanks" && opts.expectedTo && parsed.toWallet !== normalizeWallet(opts.expectedTo)) {
    throw new Error("thanks_target_mismatch");
  }

  const min = opts.minLuna ?? 1;
  if (tx.valueLuna < min) throw new Error("insufficient_amount");

  return {
    hash,
    from: from || normalizeWallet(opts.payerWallet),
    to,
    valueLuna: tx.valueLuna,
    memo,
  };
}

async function fetchTx(
  hash: string
): Promise<{ from: string; to: string; valueLuna: number; memo: string } | null> {
  // NimiqWatch-style REST; degrade gracefully if unavailable
  try {
    const res = await fetch(`${config.nimiqRpcUrl.replace(/\/$/, "")}/tx/${hash}`);
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      return {
        from: String(data.from_address ?? data.from ?? data.sender ?? ""),
        to: String(data.to_address ?? data.to ?? data.recipient ?? ""),
        valueLuna: Number(data.value ?? data.amount ?? 0),
        memo: decodeMemo(data.data ?? data.extraData ?? data.message ?? ""),
      };
    }
  } catch {
    /* fall through */
  }

  try {
    const res = await fetch(config.nimiqRpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransactionByHash",
        params: [hash],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: Record<string, unknown> };
    const r = body.result;
    if (!r) return null;
    return {
      from: String(r.from ?? r.sender ?? ""),
      to: String(r.to ?? r.recipient ?? ""),
      valueLuna: Number(r.value ?? 0),
      memo: decodeMemo(r.data ?? r.extraData ?? ""),
    };
  } catch {
    return null;
  }
}

function decodeMemo(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
      try {
        const bytes = new Uint8Array(s.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
        return new TextDecoder().decode(bytes);
      } catch {
        return s;
      }
    }
    return s;
  }
  return String(raw);
}
