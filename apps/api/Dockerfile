# Cinima API - production image (Linode VPS, Railway, etc.)
FROM node:20-alpine

RUN apk add --no-cache wget \
  && corepack enable \
  && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

COPY apps/api apps/api

RUN pnpm --filter @cinima/shared build && pnpm --filter @cinima/api build

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8787}/health" >/dev/null || exit 1

CMD ["node", "dist/index.js"]
