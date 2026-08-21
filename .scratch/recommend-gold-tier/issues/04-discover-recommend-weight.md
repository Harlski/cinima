# 04 — Discover Recommend-weighted overlap

**What to build:** Discover ranks titles with shared **Recommend** overlap above titles that only share plain **Favorite** overlap when other factors are equal, so gold taste stands out in For you.

**Blocked by:** 02 — Recommend on a Favorite (title slice)

**Status:** resolved

## Answer

Discover peer + suggestion scoring weights Recommend (3) over Favorite (1). Proven in `tests/discover-recommend.http.test.ts`.
