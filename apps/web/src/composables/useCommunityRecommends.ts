import { ref } from "vue";
import type { CommunityRecommendsResponse, TitleSummary } from "@cinima/shared";
import { useApi } from "@/composables/useApi";

/** Shared loader for GET /recommends/community (Watchlist empty + Discover tab). */
export function useCommunityRecommends() {
  const { request } = useApi();
  const movies = ref<TitleSummary[]>([]);
  const tv = ref<TitleSummary[]>([]);
  const loaded = ref(false);
  const loading = ref(false);

  async function load(opts?: { force?: boolean }) {
    if (loaded.value && !opts?.force) return;
    if (loading.value) return;
    loading.value = true;
    try {
      const data = await request<CommunityRecommendsResponse>("/recommends/community");
      movies.value = data.movies ?? [];
      tv.value = data.tv ?? [];
      loaded.value = true;
    } catch {
      movies.value = [];
      tv.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { movies, tv, loaded, loading, load };
}
