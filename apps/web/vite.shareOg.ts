import type { Plugin, Connect } from "vite";
import {
  isShareOgCrawler,
  parseShareOgPath,
  shareOgApiPath,
} from "./src/lib/shareOgCrawler";

function crawlerMiddleware(apiOrigin: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const pathOnly = (req.url || "").split("?")[0] || "";
    const target = parseShareOgPath(pathOnly);
    if (!target || !isShareOgCrawler(req.headers["user-agent"] || "")) {
      next();
      return;
    }
    try {
      const upstream = await fetch(`${apiOrigin}${shareOgApiPath(target)}`, {
        headers: { Accept: "text/html" },
      });
      const html = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    } catch {
      next();
    }
  };
}

export function shareOgPlugin(apiOrigin = "http://127.0.0.1:8787"): Plugin {
  const middleware = crawlerMiddleware(apiOrigin);
  return {
    name: "share-og",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

/** @deprecated Use shareOgPlugin */
export const titleShareOgPlugin = shareOgPlugin;
