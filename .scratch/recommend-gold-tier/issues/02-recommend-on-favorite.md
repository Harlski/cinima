# 02 — Recommend on a Favorite (title slice)

**What to build:** On a title, a user can gold-star **Recommend** an existing **Favorite**, clear that Recommend, and hit a hard block at five Recommends; unfavoriting clears Recommend. Proven with HTTP API tests; title UI exposes Favorited + Recommended and the gold control.

**Blocked by:** 01 — HTTP test harness + social-taste module prefactor

**Status:** ready-for-agent

- [ ] Recommend requires Favorite; cannot Recommend a non-favorite
- [ ] User may hold at most five Recommends; sixth attempt returns a clear error (no auto-demote)
- [ ] Clearing Recommend keeps Favorite
- [ ] Unfavoriting clears Recommend
- [ ] Title detail exposes favorited + recommended state and controls
- [ ] HTTP API tests cover the above at the primary seam (ADR-0002)
