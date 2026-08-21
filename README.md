# NimCharts

Social taste discovery for movies & TV — a **Nimiq Pay Mini App** for Cycle 2.

Wallet is the account. Favorites are public. External ratings (TMDB + OMDb) are cached in the backend DB; clients never call upstream APIs. Unlocks and comments pay the app treasury in NIM.

## Features

- Pay-only gate for the main app; public `/:username` favorites pages stay open on the web
- Wallet session auth via signed challenge (`nimiq.sign`), plus local `?demo=1` bypass
- Catalog sync TMDB + OMDb → LibSQL/SQLite cache (seed catalog when keys missing)
- Bottom tabs: Discover / Search / Activity / Me (+ title stack)
- Cold start: favorite ≥3 titles, then Discover switches to taste overlap
- Unlocks: 1 NIM / title forever, or ~10k NIM lifetime catalog unlock
- TV heat-map (season × episode); locked cells blur / `---`
- Flat comments at 0.1 NIM → treasury
- Thanks: free signal + optional tip to peer wallet
- NimConnect-style soft handle prompt for shareable public URLs

## Layout

```
apps/web         Vue 3 + Vite + TS + Vue Router + Pinia + @nimiq/mini-app-sdk
apps/api         Hono + Drizzle + LibSQL/SQLite
packages/shared  Title IDs, payment memo codecs, DTOs, prices
```

## Quick start

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
pnpm install
pnpm --filter @nimcharts/shared build
pnpm dev
```

- Web (local): http://localhost:5174/?demo=1
- Web (LAN / Nimiq Pay Discover): http://192.168.4.73:5174/ (Vite binds `0.0.0.0` via `server.host`)
- API health: http://localhost:8787/health

In Nimiq Pay: Discover → paste `http://192.168.4.73:5174/` (same Wi‑Fi as this machine). Do not use `?demo=1` inside Pay; the injected wallet is used instead.

Integration follows [nimiq.dev/mini-apps](https://nimiq.dev/mini-apps): `init()` → `listAccounts()` → `sign()` for login, and `sendBasicTransactionWithData()` for unlocks/comments/tips. The provider is **never** stored in a Vue `ref` (private fields break under Proxy — that caused “Cannot read from private field”).

With `DEMO_MODE=true` / `VITE_DEMO_MODE=1`, demo auth is used **only outside Pay** (desktop `?demo=1`).

### ~2 minute demo path

1. Open `/?demo=1` — demo wallet session connects  
2. Discover — favorite ≥3 titles  
3. Discover refreshes with overlap suggestions  
4. Open a TV title — Unlock 1 NIM — heat-map reveals  
5. Post a 0.1 NIM comment  
6. Me — set handle — open `/:username` public page  

## Environment

| Variable | Purpose |
|---|---|
| `TMDB_API_KEY` | Live search / detail sync (optional) |
| `OMDB_API_KEY` | IMDb-style scores / episode ratings |
| `TREASURY_ADDRESS` | Receives unlock / lifetime / comment payments |
| `NIMCONNECT_BASE_URL` | Soft handle lookup (degrades if unknown) |
| `DEMO_MODE` / `VITE_DEMO_MODE` | Local demo auth & payments |

## License

MIT
