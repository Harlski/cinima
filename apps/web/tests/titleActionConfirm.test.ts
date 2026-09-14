import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useTitleActionConfirm } from "../src/composables/useTitleActionConfirm";
import { useFavoritesStore } from "../src/stores/favorites";
import { useWatchlistStore } from "../src/stores/watchlist";

vi.mock("@/composables/useApi", () => ({
  useApi: () => ({
    request: vi.fn(async () => ({ ok: true, removed: true })),
  }),
}));

const TITLE = {
  id: "movie:550",
  title: "Fight Club",
} as const;

describe("Watchlist leave confirm", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const watchlist = useWatchlistStore();
    watchlist.ids.add(TITLE.id);
  });

  it("does not prompt to Favorite after Remove from Watchlist", async () => {
    const { requestToggleWatchlist, confirmPending, pendingConfirm } =
      useTitleActionConfirm();

    await requestToggleWatchlist(TITLE.id, {
      title: TITLE as never,
      isWatchlisted: true,
    });
    expect(pendingConfirm.value?.kind).toBe("watchlist");

    await confirmPending();

    expect(pendingConfirm.value).toBeNull();
    expect(useFavoritesStore().isFavorite(TITLE.id)).toBe(false);
    expect(useWatchlistStore().isOnWatchlist(TITLE.id)).toBe(false);
  });

  it("sends the chosen leave reason with Remove", async () => {
    const watchlist = useWatchlistStore();
    const toggle = vi.spyOn(watchlist, "toggle");
    const { requestToggleWatchlist, confirmPending, leaveReason } =
      useTitleActionConfirm();

    await requestToggleWatchlist(TITLE.id, {
      title: TITLE as never,
      isWatchlisted: true,
    });
    leaveReason.value = "finished";
    await confirmPending();

    expect(toggle).toHaveBeenCalledWith(TITLE.id, TITLE, "finished");
  });
});
