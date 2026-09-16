import { computed, ref } from "vue";
import {
  shouldOfferThankAllCue,
  unthankedFavoriterCount,
  type AchievementKind,
  type TitleSummary,
  type TitleSuggester,
  type WatchlistLeaveReason,
} from "@cinima/shared";
import { useApi } from "@/composables/useApi";
import {
  removeFromFavoritesMessage,
  removeFromWatchlistMessage,
} from "@/lib/titleActionLabels";
import { useFavoritesStore } from "@/stores/favorites";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { useMarqueeStore } from "@/stores/marquee";
import { useWatchlistStore } from "@/stores/watchlist";

export type TitleActionConfirmKind = "unfavorite" | "watchlist";

type TitleRef = Pick<TitleSummary, "title"> | TitleSummary;

type PendingTitleAction = {
  kind: TitleActionConfirmKind;
  titleId: string;
  titleName: string;
  title?: TitleSummary;
};

type FavoriteToggleOpts = {
  title?: TitleRef | null;
  isFavorited: boolean;
  onAdded?: () => void;
};

type WatchlistToggleOpts = {
  title?: TitleSummary | null;
  isWatchlisted: boolean;
  onAdded?: () => void;
};

type ConfirmHandlers = {
  onUnfavorite?: () => void | Promise<void>;
  onRemoveFromWatchlist?: () => void | Promise<void>;
};

export type ThankAllCue = {
  titleId: string;
  titleName: string;
  title?: TitleSummary;
};

function titleName(title?: TitleRef | null): string {
  return title?.title?.trim() || "this title";
}

export function useTitleActionConfirm() {
  const favoritesStore = useFavoritesStore();
  const watchlistStore = useWatchlistStore();
  const tour = useGuidedTourStore();
  const { request } = useApi();
  const pendingConfirm = ref<PendingTitleAction | null>(null);
  const leaveReason = ref<WatchlistLeaveReason | null>(null);
  const thankAllCue = ref<ThankAllCue | null>(null);
  const thankAllBusy = ref(false);
  const lastThankAllTitleId = ref<string | null>(null);

  const confirmMessage = computed(() => {
    if (!pendingConfirm.value) return "";
    const { kind, titleName: name } = pendingConfirm.value;
    if (kind === "unfavorite") return removeFromFavoritesMessage(name);
    return removeFromWatchlistMessage(pendingConfirm.value.title ? null : name);
  });

  function cancelConfirm() {
    pendingConfirm.value = null;
    leaveReason.value = null;
  }

  function cancelThankAll() {
    if (thankAllBusy.value) return;
    thankAllCue.value = null;
  }

  async function offerThankAllCue(titleId: string, title?: TitleSummary) {
    if (tour.active || tour.offering) return;
    try {
      const data = await request<{ suggesters: TitleSuggester[] }>(
        `/titles/${encodeURIComponent(titleId)}/suggesters`
      );
      const unthankedCount = unthankedFavoriterCount(data.suggesters);
      if (!shouldOfferThankAllCue({ unthankedCount, tourActive: false })) return;
      thankAllCue.value = {
        titleId,
        titleName: titleName(title),
        title,
      };
    } catch {
      /* leave already happened; skip the cue */
    }
  }

  async function confirmThankAll() {
    const cue = thankAllCue.value;
    if (!cue || thankAllBusy.value) return;
    thankAllBusy.value = true;
    try {
      const data = await request<{
        thanked: number;
        earnedAchievements?: AchievementKind[];
      }>("/thanks/all", {
        method: "POST",
        body: JSON.stringify({ titleId: cue.titleId }),
      });
      if (data.earnedAchievements?.length) {
        useMarqueeStore().enqueue(data.earnedAchievements);
      }
      lastThankAllTitleId.value = cue.titleId;
      thankAllCue.value = null;
    } finally {
      thankAllBusy.value = false;
    }
  }

  async function requestToggleFavorite(titleId: string, opts: FavoriteToggleOpts) {
    if (opts.isFavorited) {
      pendingConfirm.value = {
        kind: "unfavorite",
        titleId,
        titleName: titleName(opts.title),
      };
      return;
    }
    await favoritesStore.toggle(titleId);
    opts.onAdded?.();
  }

  async function requestToggleWatchlist(
    titleId: string,
    opts: WatchlistToggleOpts
  ) {
    if (opts.isWatchlisted) {
      leaveReason.value = null;
      pendingConfirm.value = {
        kind: "watchlist",
        titleId,
        titleName: titleName(opts.title),
        title: opts.title ?? undefined,
      };
      return;
    }
    await watchlistStore.toggle(titleId, opts.title ?? undefined);
    opts.onAdded?.();
  }

  async function confirmPending(handlers?: ConfirmHandlers) {
    const action = pendingConfirm.value;
    if (!action) return;

    if (action.kind === "unfavorite") {
      pendingConfirm.value = null;
      await favoritesStore.toggle(action.titleId);
      await handlers?.onUnfavorite?.();
      return;
    }

    const reason = leaveReason.value;
    const titleId = action.titleId;
    const title = action.title;
    pendingConfirm.value = null;
    leaveReason.value = null;
    await watchlistStore.toggle(titleId, title, reason);
    await handlers?.onRemoveFromWatchlist?.();
    await offerThankAllCue(titleId, title);
  }

  return {
    pendingConfirm,
    confirmMessage,
    leaveReason,
    thankAllCue,
    thankAllBusy,
    lastThankAllTitleId,
    cancelConfirm,
    cancelThankAll,
    confirmThankAll,
    confirmPending,
    requestToggleFavorite,
    requestToggleWatchlist,
  };
}
