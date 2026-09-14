import { computed, ref } from "vue";
import type { TitleSummary, WatchlistLeaveReason } from "@cinima/shared";
import {
  removeFromFavoritesMessage,
  removeFromWatchlistMessage,
} from "@/lib/titleActionLabels";
import { useFavoritesStore } from "@/stores/favorites";
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

function titleName(title?: TitleRef | null): string {
  return title?.title?.trim() || "this title";
}

export function useTitleActionConfirm() {
  const favoritesStore = useFavoritesStore();
  const watchlistStore = useWatchlistStore();
  const pendingConfirm = ref<PendingTitleAction | null>(null);
  const leaveReason = ref<WatchlistLeaveReason | null>(null);

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
    pendingConfirm.value = null;
    leaveReason.value = null;
    await watchlistStore.toggle(action.titleId, action.title, reason);
    await handlers?.onRemoveFromWatchlist?.();
  }

  return {
    pendingConfirm,
    confirmMessage,
    leaveReason,
    cancelConfirm,
    confirmPending,
    requestToggleFavorite,
    requestToggleWatchlist,
  };
}
