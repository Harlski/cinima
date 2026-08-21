import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import type { TitleSummary } from "@nimcharts/shared";

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<Set<string>>(new Set());
  const loading = ref(false);
  const { request } = useApi();

  const isFavorite = (titleId: string) => favorites.value.has(titleId);
  const count = computed(() => favorites.value.size);

  const toggle = async (titleId: string) => {
    const wasFavorite = favorites.value.has(titleId);
    if (wasFavorite) favorites.value.delete(titleId);
    else favorites.value.add(titleId);

    try {
      await request(`/favorites/${encodeURIComponent(titleId)}`, {
        method: wasFavorite ? "DELETE" : "POST",
      });
    } catch (err) {
      if (wasFavorite) favorites.value.add(titleId);
      else favorites.value.delete(titleId);
      throw err;
    }
  };

  const load = async () => {
    loading.value = true;
    try {
      const data = await request<{ favorites: TitleSummary[] }>("/me");
      favorites.value = new Set(data.favorites.map((f) => f.id));
    } catch {
      /* ignore until auth */
    } finally {
      loading.value = false;
    }
  };

  return { favorites, loading, count, isFavorite, toggle, load };
});
