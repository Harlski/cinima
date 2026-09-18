import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useGuidedTourStore } from "../src/stores/guidedTour";
import { loadTourPersistedStatus } from "../src/lib/guidedTour";

const { request } = vi.hoisted(() => ({
  request: vi.fn(async () => ({})),
}));

vi.mock("@/composables/useApi", () => ({
  useApi: () => ({ request }),
}));

vi.mock("@/stores/joinOverlay", () => ({
  useJoinOverlayStore: () => ({ pending: false, ack: vi.fn() }),
}));

vi.mock("@/stores/marquee", () => ({
  useMarqueeStore: () => ({ enqueue: vi.fn() }),
}));

vi.mock("@/stores/favorites", () => ({
  useFavoritesStore: () => ({
    isFavorite: () => false,
    isRecommended: () => false,
  }),
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ user: { walletAddress: "NQ01TOURSTORETEST" } }),
}));

describe("Guided tour store skip last-chance and Me replay", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    request.mockClear();
    setActivePinia(createPinia());
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memory.set(key, value);
        },
        removeItem: (key: string) => {
          memory.delete(key);
        },
      },
    });
  });

  it("holds Skip tour for a last-chance offer, then skips on the second try", () => {
    const tour = useGuidedTourStore();
    tour.beginTour();
    expect(tour.phase).toBe("active");
    tour.next();
    expect(tour.step?.id).toBe("search");

    tour.skip();
    expect(tour.offering).toBe(true);
    expect(tour.offerCopy.acceptLabel).toBe("Keep going");
    expect(tour.stepIndex).toBe(1);

    tour.acceptOffer();
    expect(tour.phase).toBe("active");
    expect(tour.step?.id).toBe("search");

    tour.skip();
    expect(tour.phase).toBe("idle");
    expect(tour.skipNotice).toBe(true);
    expect(loadTourPersistedStatus("NQ01TOURSTORETEST")).toBe("dismissed");
  });

  it("Me replay offer does not overwrite a completed tour on Not now", () => {
    const tour = useGuidedTourStore();
    tour.offerFromMe();
    expect(tour.offering).toBe(true);
    expect(tour.offerCopy.declineLabel).toBe("Not now");
    expect(tour.offerCopy.title).toBe("Using CINIMA");

    tour.declineOffer();
    expect(tour.offerCopy.title).toBe("The tour is quick");
    expect(tour.phase).toBe("skip-offer");

    tour.declineOffer();
    expect(tour.phase).toBe("idle");
    expect(tour.skipNotice).toBe(false);
    expect(loadTourPersistedStatus("NQ01TOURSTORETEST")).toBe("never");
  });

  it("Not now on Using CINIMA opens last-chance, Keep going starts the tour", () => {
    const tour = useGuidedTourStore();
    tour.showOffer();
    expect(tour.offerCopy.title).toBe("Using CINIMA");
    tour.declineOffer();
    expect(tour.offerCopy.title).toBe("The tour is quick");
    expect(tour.phase).toBe("skip-offer");
    tour.acceptOffer();
    expect(tour.phase).toBe("active");
    expect(tour.step?.id).toBe("watchlist-home");
  });

  it("Cue lab skip last-chance does not persist Skip anyway", () => {
    const tour = useGuidedTourStore();
    tour.previewSkipOffer();
    expect(tour.offering).toBe(true);
    expect(tour.offerCopy.declineLabel).toBe("Skip anyway");
    tour.declineOffer();
    expect(tour.phase).toBe("idle");
    expect(tour.skipNotice).toBe(false);
    expect(loadTourPersistedStatus("NQ01TOURSTORETEST")).toBe("never");
  });

  it("Cue lab wrap preview shows without starting the walkthrough", () => {
    const tour = useGuidedTourStore();
    tour.previewWrap();
    expect(tour.wrapPreview).toBe(true);
    expect(tour.phase).toBe("idle");
    tour.dismissWrapPreview();
    expect(tour.wrapPreview).toBe(false);
  });
});
