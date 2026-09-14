import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";
import type { AchievementKind, TitleDetail, TitleSummary } from "@cinima/shared";
import { useMarqueeStore } from "@/stores/marquee";
import { shouldRecordSearchUsage } from "@/lib/searchQuery";

export const useCatalogStore = defineStore("catalog", () => {
  const { request } = useApi();
  const cache = ref(new Map<string, TitleDetail>());

  const search = async (
    query: string,
    signal?: AbortSignal
  ): Promise<{ results: TitleSummary[]; stalled: boolean }> => {
    const data = await request<{ results: TitleSummary[]; tmdbTimedOut?: boolean }>(
      `/search?q=${encodeURIComponent(query)}`,
      { signal }
    );
    const stalled = Boolean(data.tmdbTimedOut) && data.results.length === 0;
    if (shouldRecordSearchUsage(query)) {
      void request<{ earnedAchievements?: AchievementKind[] }>("/usage/search", {
        method: "POST",
        body: JSON.stringify({ query }),
      })
        .then((usage) => {
          if (usage.earnedAchievements?.length) {
            useMarqueeStore().enqueue(usage.earnedAchievements);
          }
        })
        .catch(() => {});
    }
    return {
      results: data.results,
      stalled,
    };
  };

  const fetchDetail = async (id: string): Promise<TitleDetail> => {
    const data = await request<TitleDetail>(`/titles/${encodeURIComponent(id)}`);
    cache.value.set(id, data);
    void request<{ earnedAchievements?: AchievementKind[] }>("/usage/view", {
      method: "POST",
      body: JSON.stringify({ titleId: id }),
    })
      .then((usage) => {
        if (usage.earnedAchievements?.length) {
          useMarqueeStore().enqueue(usage.earnedAchievements);
        }
      })
      .catch(() => {});
    return data;
  };

  const refreshDetail = async (id: string) => fetchDetail(id);

  const recordSearchOpen = async (titleId: string): Promise<void> => {
    try {
      const usage = await request<{ earnedAchievements?: AchievementKind[] }>(
        "/usage/search-open",
        {
          method: "POST",
          body: JSON.stringify({ titleId }),
        }
      );
      if (usage.earnedAchievements?.length) {
        useMarqueeStore().enqueue(usage.earnedAchievements);
      }
    } catch {
      /* still open the title */
    }
  };

  return { search, fetchDetail, refreshDetail, recordSearchOpen, cache };
});
