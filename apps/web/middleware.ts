/**
 * Vercel Edge Middleware when the project Root Directory is `apps/web`.
 * Keep in sync with repo-root `middleware.ts` (monorepo-root deploys).
 */
export { default, config } from "./src/lib/vercelShareOgMiddleware";
