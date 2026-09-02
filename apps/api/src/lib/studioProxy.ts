const FORWARD_HEADERS = [
  "authorization",
  "x-cinima-pay",
  "x-cinima-demo",
  "content-type",
] as const;

export async function proxyStudio(
  request: Request,
  opts: {
    upstream: string;
    fetchImpl?: typeof fetch;
  }
): Promise<Response> {
  const base = opts.upstream.replace(/\/$/, "");
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    return await fetchImpl(`${base}/api/studio`, { method: "GET", headers });
  } catch {
    return Response.json({ error: "studio_unavailable" }, { status: 502 });
  }
}
