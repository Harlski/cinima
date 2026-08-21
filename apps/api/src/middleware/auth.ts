import type { SessionUser } from "@cinima/shared";
import { createMiddleware } from "hono/factory";
import { sessionFromToken } from "../services/auth.js";
import { bearerToken, isPayContext } from "../lib/util.js";
import { config } from "../lib/config.js";

export type AppEnv = {
  Variables: {
    user: SessionUser | null;
    payContext: boolean;
  };
};

export const contextMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const demoQ = c.req.query("demo");
  const pay = isPayContext(c.req.raw.headers, demoQ) || config.demoMode;
  c.set("payContext", pay);

  const token = bearerToken(c.req.raw.headers);
  const user = await sessionFromToken(token);
  c.set("user", user);
  await next();
});

/** Hard gate: outside Pay (and non-public routes) return gate payload */
export const requirePay = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("payContext") && !config.demoMode) {
    return c.json(
      {
        gate: true,
        message: "Cinima runs inside Nimiq Pay.",
        openInPayUrl: "https://www.nimiq.com/pay/",
      },
      403
    );
  }
  await next();
});

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  await next();
});
