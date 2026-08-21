import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../../../.env") });
loadEnv({ path: path.resolve(__dirname, "../../.env") });

import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { app } from "./app.js";
import { db } from "./db/index.js";
import { migrate } from "./db/migrate.js";
import * as schema from "./db/schema.js";
import { config } from "./lib/config.js";
import { seedTitles } from "./seed/seed-titles.js";
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
  await seedDemoSocialGraph();

  const hostname = process.env.HOST || "0.0.0.0";
  console.log(`[nimcharts-api] http://${hostname}:${config.port} demo=${config.demoMode}`);
  serve({ fetch: app.fetch, port: config.port, hostname });
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { app };
