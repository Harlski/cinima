<template>
  <div class="title-detail">
    <header class="detail-header">
      <button type="button" @click="goBack" class="back-button" aria-label="Back">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1>{{ title?.title || "Loading..." }}</h1>
    </header>

    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="title" class="content">
      <div class="poster-section">
        <div class="poster">
          <img v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
          <div v-else class="poster-placeholder">{{ title.title }}</div>
        </div>
        <div class="meta">
          <h2>{{ title.title }}</h2>
          <p class="year-kind">{{ title.year }} · {{ title.mediaType }}</p>
          <div v-if="title.unlocked && title.imdbRating" class="rating">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            {{ title.imdbRating.toFixed(1) }}
          </div>
          <div v-else-if="!title.unlocked" class="rating locked-rating">---</div>
          <p v-if="title.overview" class="overview">{{ title.overview }}</p>

          <button type="button" @click="toggleFavorite" class="action-button" :class="{ favorited: title.favorited }">
            {{ title.favorited ? "Favorited" : "Add to Favorites" }}
          </button>

          <button
            v-if="title.favorited"
            type="button"
            class="action-button recommend-button"
            :class="{ recommended: title.recommended }"
            @click="toggleRecommend"
          >
            {{ title.recommended ? "Recommended ★" : "Recommend ★" }}
          </button>

          <button
            v-if="!title.unlocked"
            type="button"
            class="action-button unlock-cta"
            @click="handleUnlock"
          >
            Unlock ratings ({{ unlockNim }} NIM)
          </button>
        </div>
      </div>

      <HeatMap
        v-if="title.mediaType === 'tv'"
        :episodes="title.episodes"
        :unlocked="title.unlocked"
        @unlock="handleUnlock"
      />

      <section v-if="suggesters.length" class="thanks-section">
        <h3>Thank people who favorited this</h3>
        <div class="suggester-list">
          <div v-for="s in suggesters" :key="s.walletAddress" class="suggester">
            <UserChip
              :address="s.walletAddress"
              :handle="s.handle"
              :size="32"
              @click="goToUser"
            />
            <div class="suggester-actions">
              <button type="button" @click="sendThanks(s.walletAddress)">Thanks</button>
              <button type="button" class="tip" @click="sendThanks(s.walletAddress, true)">Tip 1 NIM</button>
            </div>
          </div>
        </div>
      </section>

      <section class="comments-section">
        <h3>Comments ({{ title.commentCount }})</h3>

        <div class="comment-form">
          <textarea
            v-model="commentText"
            placeholder="Share your thoughts..."
            rows="3"
          />
          <button type="button" @click="postComment" :disabled="!commentText.trim() || posting">
            {{ posting ? "Posting..." : `Post (${commentNim} NIM)` }}
          </button>
        </div>

        <div v-if="loadingComments" class="loading-small">
          <NqSpinner :size="20" label="Loading comments" />
        </div>

        <div v-else-if="comments.length === 0" class="empty-small">
          No comments yet
        </div>

        <div v-else class="comments-list">
          <button
            v-for="comment in comments"
            :key="comment.id"
            type="button"
            class="comment"
            @click="goToUser(comment.walletAddress)"
          >
            <Identicon :address="comment.walletAddress" :size="36" alt="" />
            <div class="comment-main">
              <div class="comment-header">
                <span class="comment-user">
                  {{ displayName(comment.handle, comment.walletAddress) }}
                </span>
                <span class="comment-time">
                  {{ formatTime(comment.createdAt) }}
                </span>
              </div>
              <p class="comment-body">{{ comment.body }}</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { usePayments } from "@/composables/usePayments";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import {
  displayName,
  COMMENT_NIM,
  COMMENT_LUNA,
  UNLOCK_NIM,
  UNLOCK_LUNA,
  LUNA_PER_NIM,
} from "@nimcharts/shared";
import type { TitleDetail, CommentDto } from "@nimcharts/shared";
import HeatMap from "@/components/HeatMap.vue";
import Identicon from "@/components/Identicon.vue";
import UserChip from "@/components/UserChip.vue";
import NqSpinner from "@/components/NqSpinner.vue";

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const { sendPayment, sendTip } = usePayments();
const favoritesStore = useFavoritesStore();
const catalogStore = useCatalogStore();

const titleId = computed(() => route.params.id as string);
const loading = ref(true);
const title = ref<TitleDetail | null>(null);
const comments = ref<CommentDto[]>([]);
const loadingComments = ref(false);
const commentText = ref("");
const posting = ref(false);
const suggesters = ref<{ walletAddress: string; handle: string | null }[]>([]);

const commentNim = COMMENT_NIM;
const unlockNim = UNLOCK_NIM;

const loadTitle = async () => {
  loading.value = true;
  try {
    title.value = await catalogStore.fetchDetail(titleId.value);
    await Promise.all([loadComments(), loadSuggesters()]);
  } finally {
    loading.value = false;
  }
};

const loadComments = async () => {
  loadingComments.value = true;
  try {
    const data = await request<{ comments: CommentDto[] }>(
      `/titles/${encodeURIComponent(titleId.value)}/comments`
    );
    comments.value = data.comments;
  } finally {
    loadingComments.value = false;
  }
};

const loadSuggesters = async () => {
  try {
    const data = await request<{ suggesters: { walletAddress: string; handle: string | null }[] }>(
      `/titles/${encodeURIComponent(titleId.value)}/suggesters`
    );
    suggesters.value = data.suggesters;
  } catch {
    suggesters.value = [];
  }
};

const toggleFavorite = async () => {
  if (!title.value) return;
  const wasFavorited = title.value.favorited;
  await favoritesStore.toggle(title.value.id);
  title.value.favorited = !wasFavorited;
  if (wasFavorited) title.value.recommended = false;
};

const toggleRecommend = async () => {
  if (!title.value?.favorited) return;
  try {
    if (title.value.recommended) {
      await favoritesStore.clearRecommend(title.value.id);
      title.value.recommended = false;
    } else {
      await favoritesStore.setRecommend(title.value.id);
      title.value.recommended = true;
    }
  } catch (err) {
    console.error("Recommend failed:", err);
    alert(err instanceof Error ? err.message : "Could not update Recommend");
  }
};

const handleUnlock = async () => {
  if (!title.value) return;
  try {
    const hash = await sendPayment(UNLOCK_LUNA, {
      type: "unlock",
      titleId: title.value.id,
    });
    await request("/unlocks", {
      method: "POST",
      body: JSON.stringify({ titleId: title.value.id, txHash: hash }),
    });
    title.value = await catalogStore.refreshDetail(title.value.id);
  } catch (err) {
    console.error("Unlock failed:", err);
    alert("Failed to unlock title");
  }
};

const postComment = async () => {
  if (!title.value || !commentText.value.trim()) return;
  posting.value = true;
  try {
    const hash = await sendPayment(COMMENT_LUNA, {
      type: "comment",
      titleId: title.value.id,
    });
    await request("/comments", {
      method: "POST",
      body: JSON.stringify({
        titleId: title.value.id,
        txHash: hash,
        body: commentText.value.trim(),
      }),
    });
    commentText.value = "";
    await loadComments();
    if (title.value) title.value.commentCount++;
  } catch (err) {
    console.error("Comment failed:", err);
    alert("Failed to post comment");
  } finally {
    posting.value = false;
  }
};

const sendThanks = async (toWallet: string, withTip = false) => {
  if (!title.value) return;
  try {
    let tipTxHash: string | undefined;
    if (withTip) {
      tipTxHash = await sendTip(toWallet, LUNA_PER_NIM);
    }
    await request("/thanks", {
      method: "POST",
      body: JSON.stringify({
        toWallet,
        titleId: title.value.id,
        tipTxHash,
      }),
    });
    alert(withTip ? "Thanks + tip sent" : "Thanks sent");
  } catch (err) {
    console.error("Thanks failed:", err);
    alert("Failed to send thanks");
  }
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

const goBack = () => router.back();
const goToUser = (wallet: string) => router.push({ name: "user", params: { wallet } });

onMounted(() => {
  loadTitle();
});
</script>

<style scoped>
.title-detail {
  min-height: 100%;
  padding-bottom: 2rem;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-button {
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
}

.back-button svg {
  width: 24px;
  height: 24px;
}

.detail-header h1 {
  flex: 1;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.content {
  padding: 1rem;
}

.poster-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.poster {
  flex-shrink: 0;
  width: 120px;
  aspect-ratio: 2/3;
  background: var(--bg-surface);
  border-radius: 12px;
  overflow: hidden;
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.poster-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meta h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.year-kind {
  margin: 0;
  color: var(--text-secondary);
}

.rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f39c12;
  font-weight: 600;
  font-size: 1.1rem;
}

.rating svg {
  width: 20px;
  height: 20px;
}

.locked-rating {
  color: var(--text-secondary);
  letter-spacing: 0.15em;
}

.overview {
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
}

.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-weight: 500;
  cursor: pointer;
}

.action-button.favorited,
.action-button.recommended {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.recommend-button.recommended {
  background: #c9a227;
  border-color: #c9a227;
  color: #0a0a0f;
}
.action-button.unlock-cta {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.thanks-section,
.comments-section {
  margin-top: 2rem;
}

.thanks-section h3,
.comments-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.suggester-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.suggester {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  background: var(--bg-surface);
  border-radius: 12px;
}

.linkish {
  background: none;
  border: 0;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.suggester-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.suggester-actions button {
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
}

.suggester-actions .tip {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.comment-form {
  margin-bottom: 1.5rem;
}

.comment-form textarea {
  width: 100%;
  padding: 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.5rem;
}

.comment-form button {
  padding: 0.75rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
}

.comment-form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-small,
.empty-small {
  text-align: center;
  padding: 1rem;
  color: var(--text-secondary);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.comment {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 0;
  border-radius: 12px;
  background: var(--bg-surface);
  color: inherit;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.comment:active {
  background: #1c1c28;
}

.comment-main {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.comment-user {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.comment-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.comment-body {
  margin: 0;
  line-height: 1.4;
  color: var(--text-primary);
  font-size: 0.9rem;
}
</style>
