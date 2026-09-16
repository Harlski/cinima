import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type {
  AchievementKind,
  MediaType,
  TitleSummary,
  WatchlistFlingResponse,
  WatchlistLeaveReason,
} from "@cinima/shared";
import { useMarqueeStore } from "@/stores/marquee";

export const useWatchlistStore = defineStore("watchlist", () => {
  const ids = ref<Set<string>>(new Set());
  const titles = ref<TitleSummary[]>([]);
  const loading = ref(false);
  const { request } = useApi();

  const count = computed(() => ids.value.size);
  const isOnWatchlist = (titleId: string) => ids.value.has(titleId);

  const upsertTitle = (title: TitleSummary) => {
    titles.value = [title, ...titles.value.filter((t) => t.id !== title.id)];
  };

  const applyOrder = (next: TitleSummary[]) => {
    titles.value = next;
    ids.value = new Set(next.map((t) => t.id));
  };

  const persistFling = async (mediaType: MediaType, titleIds: string[]): Promise<void> => {
    const data = await request<WatchlistFlingResponse>("/watchlist/fling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType, titleIds }),
    });
    if (data.items?.length) applyOrder(data.items);
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
  };

  const toggle = async (
    titleId: string,
    title?: TitleSummary,
    reason?: WatchlistLeaveReason | null
  ): Promise<boolean> => {
    const wasOnList = ids.value.has(titleId);
    const previousTitles = [...titles.value];
    const previousIds = new Set(ids.value);

    if (wasOnList) {
      ids.value = new Set([...ids.value].filter((id) => id !== titleId));
      titles.value = titles.value.filter((t) => t.id !== titleId);
    } else {
      ids.value = new Set([...ids.value, titleId]);
      if (title) upsertTitle(title);
    }

    try {
      const data = await request<{
        ok?: boolean;
        removed?: boolean;
        earnedAchievements?: AchievementKind[];
      }>(
        `/watchlist/${encodeURIComponent(titleId)}`,
        {
          method: wasOnList ? "DELETE" : "POST",
          body:
            wasOnList && reason
              ? JSON.stringify({ reason })
              : undefined,
        }
      );
      if (!wasOnList && data.earnedAchievements?.length) {
        useMarqueeStore().enqueue(data.earnedAchievements);
      }
      if (!wasOnList && !title) {
        await refresh();
      }
      return wasOnList && data.removed !== false;
    } catch (err) {
      ids.value = previousIds;
      titles.value = previousTitles;
      throw err;
    }
  };

  const load = async () => {
    loading.value = true;
    try {
      const data = await request<{ watchlist?: TitleSummary[]; items?: TitleSummary[] }>("/me");
      const list = data.watchlist ?? data.items ?? [];
      titles.value = list;
      ids.value = new Set(list.map((t) => t.id));
    } catch {
      /* ignore until auth */
    } finally {
      loading.value = false;
    }
  };

  const refresh = async () => {
    loading.value = true;
    try {
      const data = await request<{ items: TitleSummary[] }>("/watchlist");
      titles.value = data.items;
      ids.value = new Set(data.items.map((t) => t.id));
    } finally {
      loading.value = false;
    }
  };

  return {
    ids,
    titles,
    loading,
    count,
    isOnWatchlist,
    applyOrder,
    persistFling,
    toggle,
    load,
    refresh,
  };
});
