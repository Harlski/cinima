export class NimiqRpcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NimiqRpcError";
  }
}

export function unwrapNimiqRpcBody(body: unknown): unknown {
  if (!body || typeof body !== "object") {
    throw new NimiqRpcError("rpc_invalid_response");
  }
  const rec = body as Record<string, unknown>;
  if ("error" in rec && rec.error != null) {
    throw new NimiqRpcError(formatRpcError(rec.error));
  }
  if (!("result" in rec)) {
    throw new NimiqRpcError("rpc_missing_result");
  }
  return unwrapData(rec.result);
}

function unwrapData(result: unknown): unknown {
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data: unknown }).data;
  }
  return result;
}

function formatRpcError(error: unknown): string {
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; data?: unknown };
    if (typeof e.data === "string" && e.data) return e.data;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  return "rpc_error";
}

export async function nimiqRpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
  fetchImpl: typeof fetch = fetch
): Promise<unknown> {
  const res = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new NimiqRpcError(`rpc_http_${res.status}`);
  }
  return unwrapNimiqRpcBody(body);
}
