import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useTitleActionConfirm } from "../src/composables/useTitleActionConfirm";
import { useFavoritesStore } from "../src/stores/favorites";
import { useGuidedTourStore } from "../src/stores/guidedTour";
import { useWatchlistStore } from "../src/stores/watchlist";

const { request, mockSuggesters } = vi.hoisted(() => {
  const mockSuggesters = {
    current: [] as { walletAddress: string; thanked: boolean }[],
  };
  const request = vi.fn(async (path: string) => {
    if (String(path).includes("/suggesters")) {
      return { suggesters: mockSuggesters.current };
    }
    if (String(path).includes("/thanks/all")) {
      return { thanked: mockSuggesters.current.filter((s) => !s.thanked).length };
    }
    return { ok: true, removed: true };
  });
  return { request, mockSuggesters };
});

vi.mock("@/composables/useApi", () => ({
  useApi: () => ({ request }),
}));

const TITLE = {
  id: "movie:550",
  title: "Fight Club",
} as const;

const UNTHANKED = [
  { walletAddress: "NQ05PEERAAAA", thanked: false },
  { walletAddress: "NQ05PEERBBBB", thanked: true },
];

describe("Watchlist leave confirm", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    request.mockClear();
    mockSuggesters.current = [];
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

describe("Watchlist leave Thank all cue", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    request.mockClear();
    mockSuggesters.current = [...UNTHANKED];
    const watchlist = useWatchlistStore();
    watchlist.ids.add(TITLE.id);
  });

  async function leaveWatchlist() {
    const flow = useTitleActionConfirm();
    await flow.requestToggleWatchlist(TITLE.id, {
      title: TITLE as never,
      isWatchlisted: true,
    });
    await flow.confirmPending();
    return flow;
  }

  it("offers Thank all after leave when Favoriters remain unthanked", async () => {
    const { thankAllCue, pendingConfirm } = await leaveWatchlist();

    expect(pendingConfirm.value).toBeNull();
    expect(thankAllCue.value?.titleId).toBe(TITLE.id);
    expect(request.mock.calls.some(([path]) => String(path).includes("/suggesters"))).toBe(
      true
    );
  });

  it("skips the cue when every Favoriter is already thanked", async () => {
    mockSuggesters.current = [{ walletAddress: "NQ05PEERAAAA", thanked: true }];
    const { thankAllCue } = await leaveWatchlist();
    expect(thankAllCue.value).toBeNull();
  });

  it("skips the cue during the Guided tour", async () => {
    const tour = useGuidedTourStore();
    tour.runtime.phase = "active";
    const { thankAllCue } = await leaveWatchlist();
    expect(thankAllCue.value).toBeNull();
    expect(request.mock.calls.some(([path]) => String(path).includes("/suggesters"))).toBe(
      false
    );
  });

  it("sends Thank all from the cue and then dismisses it", async () => {
    const { thankAllCue, confirmThankAll, lastThankAllTitleId } = await leaveWatchlist();
    expect(thankAllCue.value).not.toBeNull();

    await confirmThankAll();

    expect(thankAllCue.value).toBeNull();
    expect(lastThankAllTitleId.value).toBe(TITLE.id);
    expect(
      request.mock.calls.some(
        ([path, opts]) =>
          String(path).includes("/thanks/all") &&
          (opts as { method?: string } | undefined)?.method === "POST"
      )
    ).toBe(true);
  });

  it("dismisses the cue without Thank all", async () => {
    const { thankAllCue, cancelThankAll } = await leaveWatchlist();
    cancelThankAll();
    expect(thankAllCue.value).toBeNull();
    expect(
      request.mock.calls.some(([path]) => String(path).includes("/thanks/all"))
    ).toBe(false);
  });
});
