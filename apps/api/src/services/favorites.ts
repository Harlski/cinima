/**
 * Social taste module — Favorites and Discover overlap.
 * Prefer importing from this entrypoint over wiring routes to raw SQL.
 */
export {
  addFavorite,
  removeFavorite,
  listFavorites,
  favoriteCount,
  isFavorited,
  discoverFor,
} from "./socialTaste.js";
