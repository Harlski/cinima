<template>
  <div class="title-detail">
    <header class="detail-header">
      <button type="button" @click="goBack" class="back-button" aria-label="Back">
        <NqIcon name="arrow-left" :size="24" />
      </button>
      <button
        type="button"
        class="share-button"
        aria-label="Share title"
        @click="shareOpen = true"
      >
        <NqIcon name="link" :size="22" />
      </button>
    </header>

    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else-if="title" class="content">
      <div class="poster-section">
        <div class="poster">
          <PosterImg v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
          <div v-else class="poster-placeholder">{{ title.title }}</div>
        </div>
        <div class="meta">
          <h2>{{ title.title }}</h2>
          <p class="year-kind">{{ title.year }} · {{ title.mediaType }}</p>
          <div v-if="title.rating" class="rating">
            <NqIcon name="star" :size="20" />
            {{ title.rating.toFixed(1) }}
          </div>
          <ExpandableText
            v-if="title.overview"
            class="overview"
            :text="title.overview"
            :lines="4"
          />

          <button
            type="button"
            @click="toggleFavorite"
            class="nq-pill-stretch"
            :class="title.favorited ? 'nq-pill-blue' : 'nq-pill-secondary'"
          >
            {{ title.favorited ? "Favorited" : "Add to Favorites" }}
          </button>

          <button
            v-if="title.favorited"
            type="button"
            class="nq-pill-stretch"
            :class="title.recommended ? 'nq-pill-gold' : 'nq-pill-secondary'"
            @click="toggleRecommend"
          >
            {{ title.recommended ? "Recommended ★" : "Recommend ★" }}
          </button>

          <a
            v-if="imdbUrl"
            class="nq-pill-secondary nq-pill-stretch"
            :href="imdbUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on IMDb
          </a>
        </div>
      </div>

      <HeatMap
        v-if="title.mediaType === 'tv'"
        :episodes="title.episodes"
      />

      <section v-if="suggesters.length" class="thanks-section">
        <div class="thanks-card nq-card">
          <div class="thanks-head">
            <div class="thanks-head-left">
              <div class="thanks-stack" aria-hidden="true">
                <Identicon
                  v-for="s in suggesters.slice(0, 5)"
                  :key="s.walletAddress"
                  :address="s.walletAddress"
                  :size="28"
                  alt=""
                />
                <span v-if="suggesters.length > 5" class="thanks-more">
                  +{{ suggesters.length - 5 }}
                </span>
              </div>
              <p class="thanks-count">
                {{ suggesters.length }} favorited this
              </p>
            </div>
            <button
              v-if="unthankedCount"
              type="button"
              class="nq-pill-blue nq-pill-lg"
              :disabled="thankingAll"
              @click="thankAll"
            >
              {{ thankingAll ? "Thanking..." : "Thank all" }}
            </button>
          </div>
          <ul class="thanks-people">
            <li v-for="s in suggesters" :key="s.walletAddress" class="thanks-person">
              <button type="button" class="thanks-who" @click="goToUser(s.walletAddress)">
                <Identicon :address="s.walletAddress" :size="32" alt="" />
                <span>{{ displayName(s.handle, s.walletAddress) }}</span>
              </button>
              <button
                type="button"
                class="nq-pill-secondary nq-pill-lg thanks-btn"
                :disabled="s.thanked || thanking === s.walletAddress"
                @click="sendThanks(s.walletAddress)"
              >
                {{ s.thanked ? "Thanked" : "Thanks" }}
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section class="comments-section">
        <h3>Comments ({{ title.commentCount }})</h3>

        <div v-if="loadingComments" class="loading-small">
          <NqSpinner :size="28" label="Loading comments" />
        </div>

        <div v-else-if="comments.length === 0" class="empty-small">
          No comments yet
        </div>

        <div v-else class="comments-list">
          <article
            v-for="comment in comments"
            :key="comment.id"
            class="comment nq-card"
          >
            <button
              type="button"
              class="comment-who"
              :aria-label="displayName(comment.handle, comment.walletAddress)"
              @click="goToUser(comment.walletAddress)"
            >
              <Identicon :address="comment.walletAddress" :size="36" alt="" />
            </button>
            <div class="comment-main">
              <div class="comment-header">
                <button
                  type="button"
                  class="comment-user"
                  @click="goToUser(comment.walletAddress)"
                >
                  {{ displayName(comment.handle, comment.walletAddress) }}
                </button>
                <span class="comment-time">
                  {{ formatTime(comment.createdAt) }}
                </span>
              </div>
              <ExpandableText :text="comment.body" :lines="3" />
            </div>
          </article>
        </div>

        <form class="comment-composer nq-card" @submit.prevent="postComment">
          <Identicon :address="meWallet" :size="36" alt="" />
          <div class="composer-main">
            <textarea
              v-model="commentText"
              class="nq-input-box"
              placeholder="Share your thoughts..."
              rows="3"
            />
            <button
              type="submit"
              class="nq-pill-blue nq-pill-lg"
              :disabled="!commentText.trim() || posting"
            >
              {{ posting ? "Posting..." : "Post" }}
            </button>
          </div>
        </form>
      </section>

      <TmdbAttribution variant="compact" class="title-attr" />
    </div>

    <ShareTitleSheet
      v-if="shareOpen && title"
      :handle="authStore.user?.handle ?? null"
      :title-name="title.title"
      :media-type="title.mediaType"
      :tmdb-id="title.tmdbId"
      @close="shareOpen = false"
      @claim="goClaimHandle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import { displayName, imdbTitleUrl } from "@cinima/shared";
import type { TitleDetail, CommentDto, TitleSuggester } from "@cinima/shared";
import ExpandableText from "@/components/ExpandableText.vue";
import HeatMap from "@/components/HeatMap.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PosterImg from "@/components/PosterImg.vue";
import ShareTitleSheet from "@/components/ShareTitleSheet.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const catalogStore = useCatalogStore();

const titleId = computed(() => route.params.id as string);
const loading = ref(true);
const title = ref<TitleDetail | null>(null);
const comments = ref<CommentDto[]>([]);
const loadingComments = ref(false);
const commentText = ref("");
const posting = ref(false);
const suggesters = ref<TitleSuggester[]>([]);
const thanking = ref<string | null>(null);
const thankingAll = ref(false);
const shareOpen = ref(false);
const meWallet = computed(() => authStore.user?.walletAddress || "");
const unthankedCount = computed(() => suggesters.value.filter((s) => !s.thanked).length);
const imdbUrl = computed(() => imdbTitleUrl(title.value?.imdbId));

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
    const data = await request<{ suggesters: TitleSuggester[] }>(
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

const postComment = async () => {
  if (!title.value || !commentText.value.trim()) return;
  posting.value = true;
  try {
    await request("/comments", {
      method: "POST",
      body: JSON.stringify({
        titleId: title.value.id,
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

const sendThanks = async (toWallet: string) => {
  if (!title.value) return;
  thanking.value = toWallet;
  try {
    await request("/thanks", {
      method: "POST",
      body: JSON.stringify({
        toWallet,
        titleId: title.value.id,
      }),
    });
    suggesters.value = suggesters.value.map((s) =>
      s.walletAddress === toWallet ? { ...s, thanked: true } : s
    );
  } catch (err) {
    console.error("Thanks failed:", err);
  } finally {
    thanking.value = null;
  }
};

const thankAll = async () => {
  if (!title.value || !unthankedCount.value) return;
  thankingAll.value = true;
  try {
    await request("/thanks/all", {
      method: "POST",
      body: JSON.stringify({ titleId: title.value.id }),
    });
    suggesters.value = suggesters.value.map((s) => ({ ...s, thanked: true }));
  } catch (err) {
    console.error("Thank all failed:", err);
  } finally {
    thankingAll.value = false;
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
const goClaimHandle = () => {
  shareOpen.value = false;
  router.push({ name: "me" });
};

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
  justify-content: space-between;
  padding: 0.35rem 0 0;
}

.back-button,
.share-button {
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
  color: var(--text-secondary);
}

.content {
  padding: 1rem 0;
}

.poster-section {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.poster {
  flex: none;
  align-self: flex-start;
  width: 10rem;
  height: 15rem;
  aspect-ratio: 2 / 3;
  background: var(--bg-surface);
  border-radius: 12px;
  overflow: hidden;
}

.poster :deep(.poster-img),
.poster :deep(img) {
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.meta a.nq-pill-stretch {
  text-align: center;
  text-decoration: none;
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
  color: var(--warning);
  font-weight: 600;
  font-size: 1.1rem;
}

.rating :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}

.overview {
  margin: 0;
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

.thanks-card {
  padding: 0.95rem 1rem 0.85rem;
}

.thanks-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.thanks-head-left {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.thanks-count {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-primary);
}

.thanks-stack {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.thanks-stack :deep(.identicon) {
  margin-left: -0.45rem;
  border: 2px solid var(--bg-surface);
  box-sizing: content-box;
}

.thanks-stack :deep(.identicon:first-child) {
  margin-left: 0;
}

.thanks-more {
  margin-left: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.thanks-people {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.thanks-person {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex: 1 1 11.5rem;
  min-width: 11.5rem;
  padding: 0.35rem 0.4rem 0.35rem 0.2rem;
  border-radius: 12px;
  background: var(--colors-neutral-200);
}

.thanks-who {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.thanks-who span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thanks-btn {
  flex-shrink: 0;
}

.thanks-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.comment-composer {
  display: flex;
  flex-direction: row;
  gap: 0.7rem;
  align-items: flex-start;
  margin-top: 0.75rem;
  padding: 0.75rem;
}

.comment-composer :deep(.identicon) {
  flex-shrink: 0;
}

.composer-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
}

.composer-main textarea {
  width: 100%;
  resize: none;
  background-color: var(--colors-white);
  --color: var(--colors-darkblue);
  --placeholder-color: color-mix(in oklch, var(--colors-darkblue) 45%, transparent);
  --outline-color: color-mix(in oklch, var(--colors-darkblue) 16%, transparent);
}

.composer-main textarea::placeholder {
  opacity: 1;
}

.composer-main button:disabled {
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
  flex-direction: row;
  gap: 0.7rem;
  align-items: flex-start;
  width: 100%;
  padding: 0.75rem;
}

.comment-who {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 0;
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
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.comment-main :deep(.expandable-text) {
  font-size: 0.9rem;
  line-height: 1.4;
}

.title-attr {
  margin-top: 2rem;
}
</style>
