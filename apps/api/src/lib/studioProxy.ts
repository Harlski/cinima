const FORWARD_HEADERS = [
  "authorization",
  "x-cinima-pay",
  "x-cinima-demo",
  "content-type",
] as const;

type StudioLog = (...args: unknown[]) => void;

export type StudioProxyResult = {
  status: number;
  body: Record<string, unknown>;
};

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function unavailable(): StudioProxyResult {
  return { status: 502, body: { error: "studio_unavailable" } };
}

/**
 * Fetch Studio as JSON data. Do not return the upstream Response: undici
 * headers are immutable, and Hono CORS then throws TypeError: immutable.
 */
export async function proxyStudio(
  request: Request,
  opts: {
    upstream: string;
    fetchImpl?: typeof fetch;
    log?: StudioLog;
  }
): Promise<StudioProxyResult> {
  const log = opts.log ?? console.warn;
  const base = opts.upstream.replace(/\/$/, "");
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const upstream = await fetchImpl(`${base}/api/studio`, { method: "GET", headers });
    const text = await upstream.text();
    if (!upstream.ok && upstream.status >= 500) {
      log("[studio-proxy]", `upstream ${upstream.status}`, text.slice(0, 200));
    }
    try {
      const parsed: unknown = text ? JSON.parse(text) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { status: upstream.status, body: parsed as Record<string, unknown> };
      }
    } catch {
      log("[studio-proxy]", "non-JSON upstream", upstream.status, text.slice(0, 200));
    }
    return unavailable();
  } catch (err) {
    log("[studio-proxy]", errText(err));
    return unavailable();
  }
}
