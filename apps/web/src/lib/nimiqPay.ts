/**
 * Nimiq Pay integration helpers (nimiq.dev/mini-apps).
 *
 * Important: never store the NimiqProvider in a Vue reactive `ref`.
 * The provider uses JS private fields (#private); Vue's Proxy throws
 * "Cannot read from private field" when methods are invoked through it.
 * Keep a plain Promise / module-level variable instead (official tutorial pattern).
 */
import { init, type NimiqProvider, getHostLanguage } from "@nimiq/mini-app-sdk";

export type ProviderError = { error: { type?: string; message?: string } };

/** True when Nimiq Pay injected host context / provider (before or after init). */
export function isNimiqPay(): boolean {
  if (typeof window === "undefined") return false;
  return window.nimiqPay != null || window.nimiq != null;
}

export function getProviderErrorMessage(result: unknown): string | null {
  if (typeof result !== "object" || result === null || !("error" in result)) return null;
  const err = (result as ProviderError).error;
  if (typeof err !== "object" || err === null) return "provider_error";
  return String(err.message || err.type || "provider_error");
}

function toB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function decodeBinaryString(s: string): Uint8Array {
  const t = s.trim();
  if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) {
    const out = new Uint8Array(t.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(t.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  const binary = atob(t);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Nimiq Pay may return hex strings, base64, Uint8Array, or numeric arrays. */
export function coerceSignBytes(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) return new Uint8Array(v as number[]);
  if (typeof v === "string") return decodeBinaryString(v);
  throw new Error("invalid_wallet_encoding");
}

export function bytesToBase64(v: unknown): string {
  return toB64(coerceSignBytes(v));
}

/** Demo / desktop only — never force demo path while inside Nimiq Pay. */
export function demoEnabledOutsidePay(): boolean {
  if (isNimiqPay()) return false;
  if (import.meta.env.VITE_DEMO_MODE === "1") return true;
  if (import.meta.env.VITE_ALLOW_DEV_BYPASS === "true") return true;
  return new URLSearchParams(location.search).get("demo") === "1";
}

let nimiqPromise: Promise<NimiqProvider> | null = null;

/** Official pattern: cache `init()` Promise, not the provider instance in Vue state. */
export function getNimiq(): Promise<NimiqProvider> {
  if (typeof window !== "undefined" && window.nimiq) {
    return Promise.resolve(window.nimiq as NimiqProvider);
  }
  if (!nimiqPromise) {
    nimiqPromise = init({ timeout: 15_000 }).then(
      (provider) => provider,
      (err: unknown) => {
        nimiqPromise = null;
        throw err;
      }
    );
  }
  return nimiqPromise;
}

export async function listPayAccounts(): Promise<string[]> {
  const nimiq = await getNimiq();
  const result = await nimiq.listAccounts();
  const err = getProviderErrorMessage(result);
  if (err) throw new Error(err);
  const accounts = result as string[];
  if (!Array.isArray(accounts) || !accounts.length) throw new Error("No Nimiq accounts returned");
  return accounts;
}

export async function signPayMessage(message: string): Promise<{
  signerPublicKey: string;
  signature: string;
}> {
  const nimiq = await getNimiq();
  const result = await nimiq.sign(message);
  const err = getProviderErrorMessage(result);
  if (err) throw new Error(err);
  const { publicKey, signature } = result as { publicKey: unknown; signature: unknown };
  // Always send base64 to the API (host may return hex strings).
  return {
    signerPublicKey: bytesToBase64(publicKey),
    signature: bytesToBase64(signature),
  };
}

export async function sendPayTransaction(opts: {
  recipient: string;
  valueLuna: number;
  data: string;
}): Promise<string> {
  const nimiq = await getNimiq();
  const result = await nimiq.sendBasicTransactionWithData({
    recipient: opts.recipient,
    value: opts.valueLuna,
    data: opts.data,
  });
  const err = getProviderErrorMessage(result);
  if (err) throw new Error(err);
  if (typeof result === "string" && result.trim()) return result.trim();
  throw new Error("pay_failed");
}

export function hostLanguage(): string {
  return getHostLanguage() ?? navigator.language?.split("-")[0] ?? "en";
}
