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
          <p class="meta-line">
            <span class="rating" :class="{ muted: !hasTitleRating(title.rating) }">
              <NqIcon name="star" :size="14" />
              {{ formatTitleRating(title.rating) }}
            </span>
            <span>{{ title.year }} - {{ title.mediaType }}</span>
          </p>

          <p class="taste-counts" aria-label="Peer Recommends and Favorites">
            <button
              type="button"
              class="taste-count taste-count--recommend"
              @click="openTastePeople('recommends')"
            >
              {{ recommendCountLabel }}
            </button>
            <span class="taste-sep" aria-hidden="true">,</span>
            <button
              type="button"
              class="taste-count"
              @click="openTastePeople('favorites')"
            >
              {{ favoriteCountLabel }}
            </button>
          </p>

          <div class="meta-actions">
            <TourSpotlight :id="TOUR_SPOTLIGHT.titleWatchlist" radius="999px">
              <button
                type="button"
                @click="toggleWatchlist"
                class="nq-pill-stretch"
                :class="title.watchlisted ? 'nq-pill-gold' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.titleWatchlist"
              >
                {{ watchlistButtonLabel(title.watchlisted) }}
              </button>
            </TourSpotlight>

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
      </div>

      <ExpandableText
        v-if="title.overview"
        class="overview"
        :text="title.overview"
        :lines="4"
        :initial-expanded="expandOverview"
      />

      <HeatMap
        v-if="title.mediaType === 'tv'"
        :episodes="title.episodes"
      />

      <section v-if="suggesters.length" class="thanks-section">
        <div class="thanks-card nq-card">
          <div class="thanks-head">
            <button
              type="button"
              class="thanks-head-left"
              aria-label="Show who Favorited this"
              @click="openTastePeople('favorites')"
            >
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
            </button>
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
                <div class="comment-meta">
                  <span v-if="comment.updatedAt && !comment.deleted" class="comment-edited">
                    edited
                  </span>
                  <span class="comment-time">
                    {{ formatTime(comment.createdAt) }}
                  </span>
                </div>
              </div>

              <form
                v-if="editingCommentId === comment.id"
                class="comment-edit"
                @submit.prevent="saveEdit(comment.id)"
              >
                <textarea
                  v-model="editText"
                  class="nq-input-box"
                  rows="3"
                  :disabled="savingEdit"
                />
                <div class="comment-edit-actions">
                  <button
                    type="button"
                    class="nq-pill-secondary nq-pill-lg"
                    :disabled="savingEdit"
                    @click="cancelEdit"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="nq-pill-blue nq-pill-lg"
                    :disabled="!editText.trim() || savingEdit"
                  >
                    {{ savingEdit ? "Saving..." : "Save" }}
                  </button>
                </div>
              </form>

              <p v-else-if="comment.deleted" class="comment-deleted">
                {{ comment.body }}
              </p>
              <ExpandableText v-else :text="comment.body" :lines="2" />

              <div
                v-if="isOwnComment(comment) && !comment.deleted && editingCommentId !== comment.id"
                class="comment-actions"
              >
                <button type="button" class="comment-action" @click="startEdit(comment)">
                  Edit
                </button>
                <button type="button" class="comment-action comment-action--danger" @click="requestDeleteComment(comment.id)">
                  Delete
                </button>
              </div>
            </div>
          </article>
        </div>

        <div
          v-if="composerDocked"
          class="comment-composer-spacer"
          :style="{ height: composerSpacerHeight }"
          aria-hidden="true"
        />
        <form
          ref="composerEl"
          class="comment-composer nq-card"
          :class="{ 'comment-composer--docked': composerDocked }"
          @submit.prevent="postComment"
        >
          <Identicon :address="meWallet" :size="36" alt="" />
          <div class="composer-main">
            <textarea
              v-model="commentText"
              class="nq-input-box"
              placeholder="Share your thoughts..."
              rows="3"
              @focus="onComposerFocus"
              @blur="onComposerBlur"
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
      :poster-url="title.posterUrl"
      @close="shareOpen = false"
      @claim="goClaimHandle"
    />

    <FavoritersSheet
      v-if="favoritersOpen && title"
      :people="suggesters"
      :initial-tab="tastePeopleTab"
      :recommend-count="title.recommendCount"
      :favorite-count="title.favoriteCount"
      @close="favoritersOpen = false"
      @open-profile="onOpenFavoriterProfile"
    />

    <ConfirmDialog
      v-if="pendingConfirm"
      :message="confirmMessage"
      @cancel="cancelConfirm"
      @confirm="onConfirmAction"
    />

    <ConfirmDialog
      v-if="commentPendingDelete != null"
      message="Delete this comment?"
      @cancel="commentPendingDelete = null"
      @confirm="confirmDeleteComment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import { displayName, imdbTitleUrl, makeTitleId, type MediaType } from "@cinima/shared";
import type { TitleDetail, CommentDto, TitleSuggester } from "@cinima/shared";
import ExpandableText from "@/components/ExpandableText.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import FavoritersSheet, { type TastePeopleTab } from "@/components/FavoritersSheet.vue";
import HeatMap from "@/components/HeatMap.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PosterImg from "@/components/PosterImg.vue";
import ShareTitleSheet from "@/components/ShareTitleSheet.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import { useTitleActionConfirm } from "@/composables/useTitleActionConfirm";
import { TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { watchlistButtonLabel } from "@/lib/titleActionLabels";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { formatTitleRating, hasTitleRating } from "@/lib/titleRating";

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const catalogStore = useCatalogStore();
const tour = useGuidedTourStore();
const {
  pendingConfirm,
  confirmMessage,
  cancelConfirm,
  confirmPending,
  requestToggleFavorite,
  requestToggleWatchlist,
} = useTitleActionConfirm();

const titleId = computed(() => {
  const mediaType = route.params.mediaType;
  const tmdbId = route.params.tmdbId;
  if (typeof mediaType === "string" && typeof tmdbId === "string") {
    const n = Number(tmdbId);
    if ((mediaType === "movie" || mediaType === "tv") && Number.isFinite(n)) {
      return makeTitleId(mediaType as MediaType, n);
    }
  }
  const id = route.params.id;
  return typeof id === "string" ? decodeURIComponent(id) : "";
});
const loading = ref(true);
const title = ref<TitleDetail | null>(null);
const comments = ref<CommentDto[]>([]);
const loadingComments = ref(false);
const commentText = ref("");
const posting = ref(false);
const editingCommentId = ref<number | null>(null);
const editText = ref("");
const savingEdit = ref(false);
const commentPendingDelete = ref<number | null>(null);
const suggesters = ref<TitleSuggester[]>([]);
const thankingAll = ref(false);
const favoritersOpen = ref(false);
const tastePeopleTab = ref<TastePeopleTab>("recommends");
const shareOpen = ref(false);
const composerEl = ref<HTMLElement | null>(null);
const composerDocked = ref(false);
const composerSpacerHeight = ref("0px");
const meWallet = computed(() => authStore.user?.walletAddress || "");
const unthankedCount = computed(() => suggesters.value.filter((s) => !s.thanked).length);
const imdbUrl = computed(() => imdbTitleUrl(title.value?.imdbId));
const expandOverview = computed(() => String(route.query.overview || "") === "1");
const recommendCountLabel = computed(() => {
  const n = title.value?.recommendCount ?? 0;
  return `${n} ${n === 1 ? "recommend" : "recommends"}`;
});
const favoriteCountLabel = computed(() => {
  const n = title.value?.favoriteCount ?? 0;
  return `${n} ${n === 1 ? "favorite" : "favorites"}`;
});

let composerBlurTimer: number | undefined;

function measureComposerSpacer() {
  if (!composerEl.value) return;
  composerSpacerHeight.value = `${composerEl.value.offsetHeight}px`;
}

function onComposerFocus() {
  if (composerBlurTimer !== undefined) {
    window.clearTimeout(composerBlurTimer);
    composerBlurTimer = undefined;
  }
  composerDocked.value = true;
  void nextTick(measureComposerSpacer);
}

function undockComposer() {
  composerDocked.value = false;
  composerSpacerHeight.value = "0px";
}

function onComposerBlur() {
  // Mobile often blurs the textarea before the Post tap registers.
  composerBlurTimer = window.setTimeout(() => {
    composerBlurTimer = undefined;
    if (posting.value) return;
    if (composerEl.value?.contains(document.activeElement)) return;
    undockComposer();
  }, 180);
}

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
  await requestToggleFavorite(title.value.id, {
    title: title.value,
    isFavorited: title.value.favorited,
    onAdded: () => {
      if (title.value) title.value.favorited = true;
    },
  });
};

const toggleWatchlist = async () => {
  if (!title.value) return;
  await requestToggleWatchlist(title.value.id, {
    title: title.value,
    isWatchlisted: title.value.watchlisted,
    onAdded: () => {
      if (title.value) title.value.watchlisted = true;
      tour.reportAction("watchlist-add");
    },
  });
};

const onConfirmAction = async () => {
  await confirmPending({
    onUnfavorite: () => {
      if (!title.value) return;
      title.value.favorited = false;
      title.value.recommended = false;
    },
    onRemoveFromWatchlist: () => {
      if (title.value) title.value.watchlisted = false;
      tour.reportAction("watchlist-remove");
    },
  });
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
    undockComposer();
  } catch (err) {
    console.error("Comment failed:", err);
    alert("Failed to post comment");
  } finally {
    posting.value = false;
  }
};

const isOwnComment = (comment: CommentDto) =>
  comment.walletAddress === meWallet.value;

const startEdit = (comment: CommentDto) => {
  editingCommentId.value = comment.id;
  editText.value = comment.body;
};

const cancelEdit = () => {
  editingCommentId.value = null;
  editText.value = "";
};

const saveEdit = async (commentId: number) => {
  if (!editText.value.trim()) return;
  savingEdit.value = true;
  try {
    const data = await request<{ comment: CommentDto }>(`/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ body: editText.value.trim() }),
    });
    comments.value = comments.value.map((c) =>
      c.id === commentId ? data.comment : c
    );
    cancelEdit();
  } catch (err) {
    console.error("Edit failed:", err);
    alert("Failed to update comment");
  } finally {
    savingEdit.value = false;
  }
};

const requestDeleteComment = (commentId: number) => {
  commentPendingDelete.value = commentId;
};

const confirmDeleteComment = async () => {
  const commentId = commentPendingDelete.value;
  if (commentId == null) return;
  commentPendingDelete.value = null;
  try {
    const data = await request<{ comment: CommentDto }>(`/comments/${commentId}`, {
      method: "DELETE",
    });
    comments.value = comments.value.map((c) =>
      c.id === commentId ? data.comment : c
    );
    if (editingCommentId.value === commentId) cancelEdit();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete comment");
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

const openTastePeople = (tab: TastePeopleTab) => {
  tastePeopleTab.value = tab;
  favoritersOpen.value = true;
};

const onOpenFavoriterProfile = (wallet: string) => {
  favoritersOpen.value = false;
  goToUser(wallet);
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

onUnmounted(() => {
  if (composerBlurTimer !== undefined) window.clearTimeout(composerBlurTimer);
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
  align-items: stretch;
  gap: 1rem;
  margin-bottom: 1rem;
}

.poster {
  flex: none;
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
  max-height: 15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow: hidden;
}

.taste-counts {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.2rem;
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.3;
  color: var(--text-secondary);
}

.taste-count {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}

.taste-count--recommend {
  color: var(--gold);
  font-weight: 600;
}

.taste-sep {
  margin-right: 0.15rem;
}

.meta-actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: auto;
  min-height: 0;
}

.meta .nq-pill-stretch {
  font-size: 0.78rem;
  padding: 0.22rem 0.65rem;
  line-height: 1.25;
}

.meta a.nq-pill-stretch {
  text-align: center;
  text-decoration: none;
}

.meta h2 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.meta-line {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.3;
}

.rating {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  color: var(--warning);
  font-weight: 600;
}

.rating.muted {
  color: var(--text-secondary);
  font-weight: 500;
}

.rating :deep(.nq-icon) {
  width: 14px;
  height: 14px;
}

.overview {
  display: block;
  width: 100%;
  margin: 0 0 2rem;
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
}

.thanks-head-left {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
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

.comment-composer {
  display: flex;
  flex-direction: row;
  gap: 0.7rem;
  align-items: flex-start;
  margin-top: 0.75rem;
  padding: 0.75rem;
}

.comment-composer-spacer {
  margin-top: 0.75rem;
  pointer-events: none;
}

.comment-composer--docked {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(var(--bottom-tabs-inset, 0px) + 0.35rem);
  z-index: 40;
  width: min(
    calc(100% - 2 * var(--column-pad)),
    calc(var(--column-max) - 2 * var(--column-pad))
  );
  margin-top: 0;
  box-sizing: border-box;
}

.comment-composer :deep(.identicon) {
  flex-shrink: 0;
}

.composer-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
}

.composer-main textarea {
  width: 100%;
  resize: none;
  border-radius: 0.75rem;
  background-color: var(--colors-white);
  --color: var(--colors-darkblue);
  --placeholder-color: color-mix(in oklch, var(--colors-darkblue) 45%, transparent);
  --outline-color: color-mix(in oklch, var(--colors-darkblue) 16%, transparent);
}

.composer-main textarea::placeholder {
  opacity: 1;
}

.composer-main button {
  align-self: flex-end;
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

.comment-meta {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-shrink: 0;
}

.comment-edited {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-style: italic;
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

.comment-deleted {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--text-secondary);
  font-style: italic;
}

.comment-actions {
  display: flex;
  gap: 0.65rem;
  margin-top: 0.35rem;
}

.comment-action {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.comment-action:hover {
  text-decoration: underline;
}

.comment-action--danger {
  color: var(--text-secondary);
}

.comment-edit {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.comment-edit textarea {
  width: 100%;
  resize: none;
  border-radius: 0.75rem;
}

.comment-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.title-attr {
  margin-top: 2rem;
}
</style>
