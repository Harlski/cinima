<template>
  <div class="credits">
    <header class="credits-header">
      <button type="button" class="back-button" aria-label="Back" @click="goBack">
        <NqIcon name="arrow-left" :size="24" />
      </button>
    </header>
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>
    <div v-else class="content">
      <h1>Credits</h1>
      <p class="lede">{{ countLabel }}</p>
      <ul class="rows">
        <li
          v-for="row in catalog"
          :key="row.kind"
          :class="{ locked: !row.earnedAt }"
        >
          <span class="copy">
            <span class="name">{{ row.title }}</span>
            <span v-if="!row.earnedAt" class="how">{{ row.how }}</span>
          </span>
          <span class="when">{{ row.earnedAt ? formatWhen(row.earnedAt) : "Locked" }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  achievementTitle,
  creditsCatalog,
  type AchievementKind,
} from "@cinima/shared";
import { useApi } from "@/composables/useApi";
import LoadingWait from "@/components/LoadingWait.vue";
import NqIcon from "@/components/NqIcon.vue";
import { creditsBackAction } from "@/lib/navBack";

type EarnedRow = {
  kind: AchievementKind;
  title: string;
  earnedAt: string;
};

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const loading = ref(true);
const earned = ref<EarnedRow[]>([]);

const wallet = computed(() => decodeURIComponent(String(route.params.wallet || "")));

const catalog = computed(() => creditsCatalog(earned.value));

const earnedCount = computed(() => catalog.value.filter((row) => row.earnedAt).length);

const countLabel = computed(() => {
  const n = earnedCount.value;
  const total = catalog.value.length;
  return n === 1 ? `1 of ${total} Achievements` : `${n} of ${total} Achievements`;
});

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function goBack() {
  if (creditsBackAction() === "history") {
    router.back();
    return;
  }
  void router.push({ name: "me" });
}

async function load() {
  loading.value = true;
  try {
    const body = await request<{ achievements: EarnedRow[] }>(
      `/users/${encodeURIComponent(wallet.value)}/credits`
    );
    earned.value = (body.achievements || []).map((row) => ({
      ...row,
      title: row.title || achievementTitle(row.kind),
    }));
  } catch {
    earned.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(wallet, load);
</script>

<style scoped>
.credits {
  min-height: 100%;
  padding-bottom: 2rem;
}

.credits-header {
  display: flex;
  align-items: center;
  padding: 0.35rem 0 0;
}

.back-button {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
}

.back-button :deep(.nq-icon) {
  width: 24px;
  height: 24px;
}

.loading {
  text-align: center;
  padding: 3rem 0;
}

.content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

h1 {
  margin: 0;
  font-size: 1.35rem;
}

.lede {
  margin: 0;
  color: var(--text-secondary);
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rows li {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.rows li.locked {
  opacity: 0.55;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.name {
  font-weight: 700;
}

.how {
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.when {
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex-shrink: 0;
}
</style>
