import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type { TitleSummary } from "@cinima/shared";

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

  const toggle = async (titleId: string, title?: TitleSummary) => {
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
      await request(`/watchlist/${encodeURIComponent(titleId)}`, {
        method: wasOnList ? "DELETE" : "POST",
      });
      if (!wasOnList && !title) {
        await refresh();
      }
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
    toggle,
    load,
    refresh,
  };
});
