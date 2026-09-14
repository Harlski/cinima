import {
  COMMENT_LUNA,
  LIFETIME_UNLOCK_LUNA,
  UNLOCK_LUNA,
  isUserSendMemo,
  normalizeWallet,
  parseMemo,
} from "@cinima/shared";
import { config } from "../lib/config.js";
import { nimiqRpcCall } from "../lib/nimiqRpc.js";

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

/** Verify a User Send: 1 NIM to the thankee with a catalog Pay memo. Pay may hop. */
export async function verifyUserSend(opts: {
  txHash: string;
  payerWallet: string;
  toWallet: string;
  minLuna: number;
}): Promise<VerifiedTx> {
  const hash = String(opts.txHash ?? "").trim();
  if (!hash) throw new Error("missing_tx_hash");
  const toWallet = await canonicalWallet(opts.toWallet);
  const payerWallet = await canonicalWallet(opts.payerWallet);

  if (config.demoMode && (hash.startsWith("demo:") || hash.startsWith("dev:"))) {
    return {
      hash,
      from: payerWallet,
      to: toWallet,
      valueLuna: opts.minLuna,
      memo: "demo-user-send",
    };
  }

  const tx = await fetchTx(hash);
  if (!tx) throw new Error("tx_not_found");
  const to = await canonicalWallet(tx.to);
  const from = await canonicalWallet(tx.from);
  if (to !== toWallet) throw new Error("wrong_send_recipient");
  if (from && from !== payerWallet) {
    console.info(
      `[user-send] chain_payer_differs hash=${hash} session=${payerWallet} chainFrom=${from} rawFrom=${tx.from} chainTo=${to} rawTo=${tx.to} luna=${tx.valueLuna} memo=${JSON.stringify(tx.memo || "")}`
    );
  }
  if (tx.valueLuna < opts.minLuna) throw new Error("insufficient_amount");
  if (!isUserSendMemo(tx.memo || "")) throw new Error("memo_mismatch");

  return {
    hash,
    from: from || payerWallet,
    to,
    valueLuna: tx.valueLuna,
    memo: tx.memo || "",
  };
}

type ChainTx = { from: string; to: string; valueLuna: number; memo: string };

function pickAddress(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "address" in raw) {
    return String((raw as { address: unknown }).address ?? "");
  }
  return "";
}

/** NimiqWatch wraps txs as `{ data, metadata }`; Albatross memos live in recipientData. */
export function readChainTx(raw: unknown): ChainTx | null {
  if (!raw || typeof raw !== "object") return null;
  let rec = raw as Record<string, unknown>;
  const nested = rec.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (
      inner.to != null ||
      inner.toAddress != null ||
      inner.to_address != null ||
      inner.recipient != null ||
      inner.from != null
    ) {
      rec = inner;
    }
  }
  const to = pickAddress(rec.to_address ?? rec.toAddress ?? rec.to ?? rec.recipient);
  const from = pickAddress(rec.from_address ?? rec.fromAddress ?? rec.from ?? rec.sender);
  if (!to) return null;
  return {
    from,
    to,
    valueLuna: Number(rec.value ?? rec.amount ?? 0),
    memo: decodeMemo(
      rec.recipientData ?? rec.recipient_data ?? rec.data ?? rec.extraData ?? rec.message ?? ""
    ),
  };
}

async function canonicalWallet(addr: string): Promise<string> {
  const compact = normalizeWallet(addr);
  if (!compact) return "";
  const raw = compact.startsWith("0X") ? compact.slice(2) : compact;
  try {
    const { Address, PublicKey } = await import("@nimiq/core");
    try {
      return normalizeWallet(Address.fromAny(raw).toUserFriendlyAddress());
    } catch {
      if (/^[0-9A-F]{64}$/.test(raw)) {
        return normalizeWallet(
          PublicKey.fromHex(raw.toLowerCase()).toAddress().toUserFriendlyAddress()
        );
      }
      if (/^00[0-9A-F]{64}$/.test(raw)) {
        return normalizeWallet(
          PublicKey.fromHex(raw.slice(2).toLowerCase()).toAddress().toUserFriendlyAddress()
        );
      }
      return compact;
    }
  } catch {
    return compact;
  }
}

export function normalizeTxHash(raw: string): string {
  let h = String(raw ?? "").trim();
  if (h.startsWith("0x") || h.startsWith("0X")) h = h.slice(2);
  if (/^[0-9a-fA-F]+$/.test(h) && h.length % 2 === 0) return h.toLowerCase();
  return h;
}

async function resolveLookupHash(raw: string): Promise<string> {
  const hex = normalizeTxHash(raw);
  if (hex.length === 64) return hex;
  if (hex.length > 64 && /^[0-9a-f]+$/.test(hex)) {
    try {
      const Nimiq = await import("@nimiq/core");
      return normalizeTxHash(Nimiq.Transaction.fromAny(hex).hash());
    } catch {
      return hex;
    }
  }
  return hex;
}

async function rpcLookup(method: string, hash: string): Promise<ChainTx | null> {
  try {
    return readChainTx(await nimiqRpcCall(config.nimiqRpcUrl, method, [hash]));
  } catch {
    return null;
  }
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchTx(hash: string): Promise<ChainTx | null> {
  const lookupHash = await resolveLookupHash(hash);
  const attempts = config.txLookupAttempts;
  const delayMs = config.txLookupDelayMs;
  for (let i = 0; i < attempts; i++) {
    const mined = await rpcLookup("getTransactionByHash", lookupHash);
    if (mined) return mined;
    const pooled = await rpcLookup("getTransactionFromMempool", lookupHash);
    if (pooled) return pooled;
    if (i < attempts - 1) await sleep(delayMs);
  }
  return null;
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
