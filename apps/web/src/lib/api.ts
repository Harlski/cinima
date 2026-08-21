import { demoEnabledOutsidePay, isNimiqPay } from "./nimiqPay";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function demoEnabled(): boolean {
  return demoEnabledOutsidePay();
}

export { isNimiqPay, demoEnabledOutsidePay };

export function payHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isNimiqPay()) headers["X-Cinima-Pay"] = "1";
  if (demoEnabledOutsidePay()) headers["X-Cinima-Demo"] = "1";
  return headers;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(payHeaders() as Record<string, string>),
    ...(options.headers as Record<string, string>),
  };
  const demoQ =
    demoEnabledOutsidePay() && !path.includes("demo=")
      ? `${path.includes("?") ? "&" : "?"}demo=1`
      : "";
  const url = path.startsWith("http") ? path : `${API_BASE}/api${path}${demoQ}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `API error: ${response.status}`);
  }
  return data as T;
}

export { API_BASE };
