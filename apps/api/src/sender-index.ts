import "./load-env.js";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { migrate } from "./db/migrate.js";
import { config } from "./lib/config.js";
import { processQueue, planSystemPings, startSenderLoop } from "./services/sends.js";

const senderApp = new Hono();
senderApp.get("/health", (c) => c.json({ ok: true, role: "sender" }));

async function main() {
  await migrate();
  const hostname = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || config.senderPort);
  console.log(`[cinima-sender] http://${hostname}:${port}`);
  serve({ fetch: senderApp.fetch, port, hostname });
  startSenderLoop();
}

if (!process.env.VITEST) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { senderApp, planSystemPings, processQueue };
