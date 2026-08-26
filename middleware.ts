/**
 * Vercel Edge Middleware when the project root is the monorepo root.
 * Keep in sync with `apps/web/middleware.ts` (apps/web Root Directory deploys).
 */
export { default, config } from "./apps/web/src/lib/vercelShareOgMiddleware";
