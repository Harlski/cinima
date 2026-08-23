import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type { TitleSummary } from "@cinima/shared";

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<Set<string>>(new Set());
  const recommends = ref<Set<string>>(new Set());
  const loading = ref(false);
  const { request } = useApi();

  const isFavorite = (titleId: string) => favorites.value.has(titleId);
  const isRecommended = (titleId: string) => recommends.value.has(titleId);
  const count = computed(() => favorites.value.size);

  const addMany = async (titleIds: string[]) => {
    const unique = [...new Set(titleIds)].filter((id) => !favorites.value.has(id));
    if (!unique.length) return;
    for (const titleId of unique) {
      favorites.value.add(titleId);
    }
    try {
      await Promise.all(
        unique.map((titleId) =>
          request(`/favorites/${encodeURIComponent(titleId)}`, { method: "POST" })
        )
      );
    } catch (err) {
      for (const titleId of unique) {
        favorites.value.delete(titleId);
      }
      throw err;
    }
  };

  const toggle = async (titleId: string) => {
    const wasFavorite = favorites.value.has(titleId);
    if (wasFavorite) {
      favorites.value.delete(titleId);
      recommends.value.delete(titleId);
    } else {
      favorites.value.add(titleId);
    }

    try {
      await request(`/favorites/${encodeURIComponent(titleId)}`, {
        method: wasFavorite ? "DELETE" : "POST",
      });
    } catch (err) {
      if (wasFavorite) favorites.value.add(titleId);
      else {
        favorites.value.delete(titleId);
        recommends.value.delete(titleId);
      }
      throw err;
    }
  };

  const setRecommend = async (titleId: string) => {
    await request(`/recommends/${encodeURIComponent(titleId)}`, { method: "POST" });
    recommends.value.add(titleId);
    favorites.value.add(titleId);
  };

  const clearRecommend = async (titleId: string) => {
    await request(`/recommends/${encodeURIComponent(titleId)}`, { method: "DELETE" });
    recommends.value.delete(titleId);
  };

  const load = async () => {
    loading.value = true;
    try {
      const data = await request<{ favorites: TitleSummary[]; recommends: TitleSummary[] }>("/me");
      favorites.value = new Set(data.favorites.map((f) => f.id));
      recommends.value = new Set((data.recommends || []).map((r) => r.id));
    } catch {
      /* ignore until auth */
    } finally {
      loading.value = false;
    }
  };

  return {
    favorites,
    recommends,
    loading,
    count,
    isFavorite,
    isRecommended,
    toggle,
    addMany,
    setRecommend,
    clearRecommend,
    load,
  };
});
