import "./load-env.js";

import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { app } from "./app.js";
import { db } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import * as schema from "./db/schema.js";
import { config } from "./lib/config.js";
import { seedTitles } from "./seed/seed-titles.js";
import { prefetchPopularCatalog } from "./services/catalog.js";
import { seedDemoSocialGraph } from "./services/demoSocial.js";

async function main() {
  await migrate();
  const titleCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.titles)
    .then((r) => Number(r[0]?.count || 0));
  if (titleCount === 0) {
    console.log("[seed] catalog…");
    await seedTitles(db);
  }
  if (config.demoMode) {
    await seedDemoSocialGraph();
  }

  if (config.tmdbApiKey) {
    console.log("[catalog] prefetching popular recent titles…");
    try {
      const result = await prefetchPopularCatalog();
      if (result.skipped) {
        console.log(`[catalog] prefetch skipped (pool=${result.poolSize})`);
      } else {
        console.log(
          `[catalog] prefetch done upserted=${result.upserted} pool=${result.poolSize}`
        );
      }
    } catch (err) {
      console.warn("[catalog] prefetch failed", err);
    }
  } else {
    console.log("[catalog] TMDB_API_KEY unset — skipping popular prefetch");
  }

  const hostname = process.env.HOST || "0.0.0.0";
  console.log(
    `[cinima-api] http://${hostname}:${config.port} demo=${config.demoMode} tmdb=${config.tmdbApiKey ? "on" : "off"}`
  );
  serve({ fetch: app.fetch, port: config.port, hostname });
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { app };
