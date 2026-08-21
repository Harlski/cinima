# 02 — Recommend on a Favorite (title slice)

**What to build:** On a title, a user can gold-star **Recommend** an existing **Favorite**, clear that Recommend, and hit a hard block at five Recommends; unfavoriting clears Recommend. Proven with HTTP API tests; title UI exposes Favorited + Recommended and the gold control.

**Blocked by:** 01 — HTTP test harness + social-taste module prefactor

**Status:** resolved

## Answer

`POST/DELETE /api/recommends/:titleId` with Favorites `recommended_at`, cap of 5, title detail flags, and title UI gold control. Covered in `tests/recommend.http.test.ts`.
