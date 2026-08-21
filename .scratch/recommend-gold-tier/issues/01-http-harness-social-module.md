# 01 — HTTP test harness + social-taste module prefactor

**What to build:** Developers can run automated HTTP API tests against an isolated SQLite DB, and Favorite / Discover behaviour lives behind a clear social-taste module seam in the single API deployable — without changing user-visible Favorite or Discover outcomes.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Answer

HTTP API test harness (vitest + temp SQLite) is in place with Favorite round-trip and Discover onboarding smoke tests. Favorite/Discover live behind `services/socialTaste` with `services/favorites` as the public module entry; `app.ts` is the HTTP app, `index.ts` bootstraps/serve only.
