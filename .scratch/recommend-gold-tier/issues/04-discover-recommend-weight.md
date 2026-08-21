# 04 — Discover Recommend-weighted overlap

**What to build:** Discover ranks titles with shared **Recommend** overlap above titles that only share plain **Favorite** overlap when other factors are equal, so gold taste stands out in For you.

**Blocked by:** 02 — Recommend on a Favorite (title slice)

**Status:** ready-for-agent

- [ ] Overlap scoring weights a shared Recommend more heavily than a shared Favorite alone
- [ ] Favorite-only overlap still surfaces titles when Recommends are sparse (Discover does not go empty solely due to weighting)
- [ ] HTTP API tests with controlled fixtures assert Recommend-overlap ranks above Favorite-only overlap ceteris paribus
- [ ] Discover UI continues to present results coherently (badge/cue optional if already on cards)
