export const WATCHLIST_TAB_LABEL = "Watchlist";

export function watchlistButtonLabel(watchlisted: boolean): string {
  return watchlisted ? "In Watchlist" : "Add to Watchlist";
}

export function removeFromWatchlistMessage(titleName: string): string {
  return `Remove ${titleName} from Watchlist?`;
}

export function removeFromFavoritesMessage(titleName: string): string {
  return `Remove ${titleName} from favorites?`;
}

export function watchlistAddAriaLabel(): string {
  return "Add to Watchlist";
}

export function watchlistRemoveAriaLabel(): string {
  return "Remove from Watchlist";
}
