import { defineStore } from "pinia";
import { ref } from "vue";
import { useApi } from "@/composables/useApi";
import type { TitleDetail, TitleSummary } from "@cinima/shared";

export const useCatalogStore = defineStore("catalog", () => {
  const { request } = useApi();
  const cache = ref(new Map<string, TitleDetail>());

  const search = async (query: string): Promise<TitleSummary[]> => {
    const data = await request<{ results: TitleSummary[] }>(
      `/search?q=${encodeURIComponent(query)}`
    );
    return data.results;
  };

  const fetchDetail = async (id: string): Promise<TitleDetail> => {
    const data = await request<TitleDetail>(`/titles/${encodeURIComponent(id)}`);
    cache.value.set(id, data);
    return data;
  };

  const refreshDetail = async (id: string) => fetchDetail(id);

  return { search, fetchDetail, refreshDetail, cache };
});
