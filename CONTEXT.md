# Cinima

Social taste discovery for movies and TV inside Nimiq Pay. Users share favorites so peers can find titles through taste overlap.

## Language

**Favorite**:
A user’s mark that they enjoy a movie or show. Binary per user and title; the baseline taste signal.
_Avoid_: like, watchlist, save, bookmark

**Recommend**:
A gold-star upgrade on a Favorite, meaning this title stands out among the user’s favorites — not a separate mark from Favorite. A user may hold at most five Recommends at a time; a sixth is blocked until one is removed. Unfavoriting clears Recommend. Shared Recommends are a stronger taste-overlap signal than shared Favorites alone.
_Avoid_: rating, review, super-like (unless used only as UI synonym), highlight
