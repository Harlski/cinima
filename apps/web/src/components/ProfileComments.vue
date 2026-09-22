<template>
  <section class="profile-comments">
    <h2 v-if="showHeading">Comments</h2>
    <p v-if="loaded && !items.length" class="profile-section-empty">No Comments yet.</p>
    <CommentFeedGrouped
      v-if="items.length"
      :items="items"
      :own-wallet="ownWallet"
      :thank-busy-id="null"
      hide-author
      @open-title="goToTitle"
      @thank="thankComment"
      @send="offerCommentSend"
    />
    <button
      v-if="hasMore"
      type="button"
      class="nq-pill-secondary nq-pill-stretch more"
      :disabled="loadingMore"
      :aria-busy="loadingMore"
      @click="loadMore"
    >
      {{ acceptedWaitLabel("Load more", loadingMore) }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import {
  type CommentFeedItem,
  type HandleCommentsResponse,
} from "@cinima/shared";
import CommentFeedGrouped from "@/components/CommentFeedGrouped.vue";
import { useApi } from "@/composables/useApi";
import { handleCommentsPath } from "@/lib/handleComments";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { useAuthStore } from "@/stores/auth";
import { useUserSendStore } from "@/stores/userSend";

const props = withDefaults(
  defineProps<{
    walletAddress: string;
    showHeading?: boolean;
  }>(),
  { showHeading: true }
);

const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();

const items = ref<CommentFeedItem[]>([]);
const hasMore = ref(false);
const loadingMore = ref(false);
const loaded = ref(false);

const ownWallet = computed(() => authStore.user?.walletAddress ?? null);

async function loadPage(offset: number, append: boolean) {
  const data = await request<HandleCommentsResponse>(
    handleCommentsPath(props.walletAddress, offset)
  );
  items.value = append ? [...items.value, ...data.items] : data.items;
  hasMore.value = data.hasMore;
}

async function reload() {
  items.value = [];
  hasMore.value = false;
  loaded.value = false;
  try {
    await loadPage(0, false);
  } catch {
    items.value = [];
    hasMore.value = false;
  } finally {
    loaded.value = true;
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await loadPage(items.value.length, true);
  } catch {
    /* keep the current page and hasMore so Load more can be retried */
  } finally {
    loadingMore.value = false;
  }
}

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const thankComment = (item: CommentFeedItem) => {
  if (item.thanked) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: item.walletAddress,
    handle: item.handle,
    commentId: item.id,
  });
};

const offerCommentSend = (item: CommentFeedItem) => {
  if (!item.thanked || item.sent) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: item.walletAddress,
    handle: item.handle,
    commentId: item.id,
  });
};

watch(
  () => props.walletAddress,
  (wallet) => {
    if (wallet) void reload();
  },
  { immediate: true }
);

watch(
  () => useUserSendStore().lastThanked,
  (thanked) => {
    if (!thanked || thanked.kind !== "comment") return;
    items.value = items.value.map((row) =>
      row.id === thanked.commentId
        ? {
            ...row,
            thanked: true,
            thanksCount: row.thanked ? row.thanksCount : row.thanksCount + 1,
          }
        : row
    );
  }
);

watch(
  () => useUserSendStore().lastAttached,
  (attached) => {
    if (!attached || attached.kind !== "comment") return;
    items.value = items.value.map((row) =>
      row.id === attached.commentId ? { ...row, sent: true } : row
    );
  }
);
</script>

<style scoped>
.profile-comments {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.profile-comments h2 {
  margin: 0;
  font-size: 1.1rem;
}

.more {
  margin-top: 0.15rem;
}
</style>
