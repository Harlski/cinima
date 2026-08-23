/**
 * Social taste module — Favorites, Recommends, and Discover overlap.
 * Prefer importing from this entrypoint over wiring routes to raw SQL.
 */
export {
  SocialTasteError,
  addFavorite,
  removeFavorite,
  listFavorites,
  listRecommends,
  favoriteCount,
  recommendCount,
  isFavorited,
  isRecommended,
  setRecommend,
  clearRecommend,
  discoverFor,
  skipDiscoverOnboarding,
} from "./socialTaste.js";
