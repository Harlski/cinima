<template>
  <div class="activity">
    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>

    <div v-else-if="items.length === 0" class="empty">
      <p>No activity yet</p>
    </div>

    <div v-else class="feed">
      <article
        v-for="item in items"
        :key="`${item.type}-${item.id}`"
        class="activity-item"
        @click="handleItemClick(item)"
      >
        <button
          type="button"
          class="avatar-btn"
          @click.stop="goToUser(getWallet(item))"
        >
          <Identicon :address="getWallet(item)" :size="36" alt="" />
        </button>

        <div class="item-body">
          <div class="item-top">
            <span class="item-user">{{ displayName(getHandle(item), getWallet(item)) }}</span>
            <span class="item-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          <p class="item-text">
            <span class="kind" :class="item.type">{{ kindLabel(item) }}</span>
            <template v-if="item.type === 'comment'">
              {{ truncate(item.body, 90) }}
            </template>
            <template v-else-if="item.type === 'thanks'">
              for {{ item.titleName }}
              <span v-if="item.tipped" class="tipped">· tipped</span>
            </template>
            <template v-else>
              {{ item.titleName }}
            </template>
          </p>
          <div v-if="item.type === 'comment'" class="item-title">{{ item.titleName }}</div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import type { ActivityItem } from "@cinima/shared";
import { displayName } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";
import LoadingWait from "@/components/LoadingWait.vue";

const router = useRouter();
const { request } = useApi();

const loading = ref(true);
const items = ref<ActivityItem[]>([]);

const loadActivity = async () => {
  loading.value = true;
  try {
    const data = await request<{ items: ActivityItem[] }>("/activity");
    items.value = data.items;
  } finally {
    loading.value = false;
  }
};

const getWallet = (item: ActivityItem) => {
  if (item.type === "comment" || item.type === "unlock") return item.walletAddress;
  return item.fromWallet;
};

const getHandle = (item: ActivityItem) => {
  if (item.type === "comment" || item.type === "unlock") return item.handle;
  return item.fromHandle;
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const kindLabel = (item: ActivityItem) => {
  if (item.type === "comment") return "commented";
  if (item.type === "thanks") return "thanked you";
  return "unlocked";
};

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "now";
};

const handleItemClick = (item: ActivityItem) => {
  router.push({ name: "title", params: { id: item.titleId } });
};

const goToUser = (wallet: string) => {
  router.push({ name: "user", params: { wallet } });
};

onMounted(() => {
  loadActivity();
});
</script>

<style scoped>
.activity {
  min-height: 100%;
  padding-bottom: 2rem;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.feed {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0;
}

.activity-item {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.65rem 0.75rem;
  background: var(--bg-surface);
  border-radius: 12px;
  cursor: pointer;
}

.activity-item:active {
  background: var(--colors-neutral-200);
}

.avatar-btn {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.item-body {
  flex: 1;
  min-width: 0;
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.item-user {
  font-weight: 600;
  font-size: 0.92rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.item-text {
  margin: 0;
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kind {
  display: inline;
  font-weight: 600;
  margin-right: 0.3rem;
  color: var(--text-secondary);
}

.kind.comment {
  color: var(--primary);
}

.kind.thanks {
  color: var(--primary);
}

.kind.unlock {
  color: var(--success);
}

.tipped {
  color: var(--primary);
  font-weight: 500;
}

.item-title {
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
