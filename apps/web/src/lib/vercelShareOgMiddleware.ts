import { SHARE_OG_MATCHER } from "./shareOgCrawler";
import { handleShareOgRequest, resolveShareOgApiBase } from "./shareOgEdge";

export const config = {
  matcher: [...SHARE_OG_MATCHER],
};

function edgeEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process;
  return proc?.env?.[name];
}

/** Vercel Edge entry: crawlers get Share preview HTML from the API. */
export default async function middleware(
  request: Request
): Promise<Response | undefined> {
  const response = await handleShareOgRequest(request, {
    apiBase: resolveShareOgApiBase({
      VITE_API_BASE: edgeEnv("VITE_API_BASE"),
      API_ORIGIN: edgeEnv("API_ORIGIN"),
    }),
  });
  return response ?? undefined;
}
