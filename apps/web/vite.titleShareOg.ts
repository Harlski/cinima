import type { Plugin, Connect } from "vite";
import {
  isTitleShareCrawler,
  TITLE_SHARE_PATH,
} from "./src/lib/titleShareCrawler";

function crawlerMiddleware(apiOrigin: string): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const pathOnly = (req.url || "").split("?")[0] || "";
    const match = TITLE_SHARE_PATH.exec(pathOnly);
    if (!match || !isTitleShareCrawler(req.headers["user-agent"] || "")) {
      next();
      return;
    }
    try {
      const [, handle, mediaType, tmdbId] = match;
      const upstream = await fetch(
        `${apiOrigin}/api/public/${encodeURIComponent(handle!)}/t/${mediaType}/${tmdbId}`,
        { headers: { Accept: "text/html" } }
      );
      const html = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    } catch {
      next();
    }
  };
}

export function titleShareOgPlugin(
  apiOrigin = "http://127.0.0.1:8787"
): Plugin {
  const middleware = crawlerMiddleware(apiOrigin);
  return {
    name: "title-share-og",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
