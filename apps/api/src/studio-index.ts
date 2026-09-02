import "./load-env.js";

import { serve } from "@hono/node-server";
import { migrate } from "./db/migrate.js";
import { config } from "./lib/config.js";
import { studioApp } from "./studio.js";

async function main() {
  await migrate();
  const hostname = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || config.studioPort);
  console.log(`[cinima-studio] http://${hostname}:${port}`);
  serve({ fetch: studioApp.fetch, port, hostname });
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { studioApp };
