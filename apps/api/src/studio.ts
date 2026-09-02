import { Hono } from "hono";
import { cors } from "hono/cors";
import { isCreatorWallet } from "@cinima/shared";
import { bearerToken } from "./lib/util.js";
import { sessionFromToken } from "./services/auth.js";
import { getStudioSnapshot } from "./services/studio.js";

const studioApp = new Hono();

studioApp.use(
  "*",
  cors({
    origin: (o) => o || "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Cinima-Pay", "X-Cinima-Demo"],
    allowMethods: ["GET", "OPTIONS"],
  })
);

studioApp.get("/health", (c) => c.json({ ok: true, role: "studio" }));

studioApp.get("/api/studio", async (c) => {
  const token = bearerToken(c.req.raw.headers);
  if (!token) return c.json({ error: "unauthorized" }, 401);
  const session = await sessionFromToken(token);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  if (!isCreatorWallet(session.walletAddress)) {
    return c.json({ error: "not_found" }, 404);
  }
  return c.json(await getStudioSnapshot());
});

export { studioApp };
