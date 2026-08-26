# Cinima

Social taste discovery for movies and TV — a **Nimiq Pay Mini App**.

Wallet is the account. Favorites are public. Catalog metadata and ratings come from **TMDB** and are cached in the backend; clients never call upstream APIs. Cinima does not charge NIM for catalog data.

This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

## Features

- Public Landing at `/` (what Cinima is + Pay-only); Pay-only *identity* for the main app; public `/:username` profiles and Title Share `/:handle/t/{movie|tv}/{tmdbId}` pages stay open on the web
- Wallet session auth via signed challenge (`nimiq.sign`), plus local `?demo=1` bypass
- Catalog sync TMDB → LibSQL/SQLite cache (seed catalog when keys missing)
- Bottom tabs: Discover / Watchlist / Search / Me (+ title stack)
- Cold start: favorite ≥3 titles, then Discover switches to taste overlap
- Ratings and TV heat-maps are always visible (TMDB `vote_average`)
- Free flat comments and thanks (no treasury payments)
- Soft handle prompt for shareable public URLs
- In-app TMDB attribution and source terms (Me → Sources & terms)

## Layout

```
apps/web         Vue 3 + Vite + TS + Vue Router + Pinia + @nimiq/mini-app-sdk
apps/api         Hono + Drizzle + LibSQL/SQLite
packages/shared  Title IDs, payment memo codecs, DTOs
```

## Quick start

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm --filter @cinima/shared build
pnpm dev
```

- Web (local): http://localhost:5174/?demo=1
- API health: http://localhost:8787/health

In Nimiq Pay Discover, paste your machine's LAN URL for the Vite app (binds `0.0.0.0` via `server.host`). Do not use `?demo=1` inside Pay; the injected wallet is used instead.

Share / open links use the [official mini app intents](https://nimiq.dev/mini-apps):

- Custom scheme: `nimiqpay://miniapp?url=cinima.app`
- HTTPS: `https://nimpay.app/miniapps/open/cinima.app`

Web CTAs and API `openInPayUrl` use the HTTPS form (with the live origin / `WEB_ORIGIN` host).

Integration follows [nimiq.dev/mini-apps](https://nimiq.dev/mini-apps): `init()` → `listAccounts()` → `sign()` for login. The provider is **never** stored in a Vue `ref` (private fields break under Proxy).

With `DEMO_MODE=true` / `VITE_DEMO_MODE=1`, demo auth is used **only outside Pay** (desktop `?demo=1`).

### Demo path

1. Open `/?demo=1` — demo wallet session connects
2. Discover — favorite ≥3 titles
3. Discover refreshes with overlap suggestions
4. Open a TV title — ratings and heat-map are visible
5. Post a comment
6. Me — set handle — open `/:username` public page, or share a Title from its page

## Environment

| Variable | Purpose |
|---|---|
| `TMDB_API_KEY` | Live search / detail / ratings sync (optional) |
| `DEMO_MODE` / `VITE_DEMO_MODE` | Local demo auth |

## License

MIT
