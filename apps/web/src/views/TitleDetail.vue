<template>
  <div class="title-detail">
    <button
      type="button"
      class="back-button"
      aria-label="Back"
      :hidden="recommendCueOpen || commentSheetOpen"
      @click="goBack"
    >
      <NqIcon name="arrow-left" :size="24" />
    </button>

    <div v-if="loading" class="loading">
      <LoadingWait />
    </div>

    <div v-else-if="title" class="content">
      <div class="poster-section" data-flight-origin>
        <GoldGlowShell v-if="title.recommended" radius="12px" class="poster-glow">
          <div class="poster" data-flight-poster>
            <PosterImg v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
            <div v-else class="poster-placeholder">{{ title.title }}</div>
          </div>
        </GoldGlowShell>
        <div v-else class="poster" data-flight-poster>
          <PosterImg v-if="title.posterUrl" :src="title.posterUrl" :alt="title.title" />
          <div v-else class="poster-placeholder">{{ title.title }}</div>
        </div>
        <div class="meta">
          <div class="meta-title">
            <h2>{{ title.title }}</h2>
            <button
              type="button"
              class="share-button"
              aria-label="Share title"
              @click="openTitleShare"
            >
              <NqIcon name="link" :size="20" />
            </button>
          </div>
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
                @click="toggleWatchlist($event)"
                class="nq-pill-stretch"
                :class="title.watchlisted ? 'nq-pill-gold' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.titleWatchlist"
              >
                {{ watchlistButtonLabel(title.watchlisted) }}
              </button>
            </TourSpotlight>

            <TourSpotlight :id="TOUR_SPOTLIGHT.titleFavorite" radius="999px">
              <button
                type="button"
                @click="toggleFavorite($event)"
                class="nq-pill-stretch"
                :class="title.favorited ? 'nq-pill-blue' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.titleFavorite"
              >
                {{ title.favorited ? "Favorited" : "Add to Favorites" }}
              </button>
            </TourSpotlight>

            <TourSpotlight
              v-if="title.favorited"
              :id="TOUR_SPOTLIGHT.titleRecommend"
              radius="999px"
            >
              <button
                type="button"
                class="nq-pill-stretch"
                :class="title.recommended ? 'nq-pill-gold' : 'nq-pill-secondary'"
                :data-tour="TOUR_SPOTLIGHT.titleRecommend"
                @click="toggleRecommend($event)"
              >
                {{ title.recommended ? "Recommended ★" : "Recommend ★" }}
              </button>
            </TourSpotlight>

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

      <section v-if="unthankedCount" class="thanks-section">
        <button
          type="button"
          class="nq-pill-blue nq-pill-lg nq-pill-stretch"
          :disabled="thankingAll"
          :aria-busy="thankingAll"
          @click="thankAll"
        >
          {{ acceptedWaitLabel("Thank all", thankingAll) }}
        </button>
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
                    :aria-busy="savingEdit"
                  >
                    {{ acceptedWaitLabel("Save", savingEdit) }}
                  </button>
                </div>
              </form>

              <p v-else-if="comment.deleted" class="comment-deleted">
                {{ comment.body }}
              </p>
              <ExpandableText v-else :text="comment.body" :lines="2" />

              <div
                v-if="!comment.deleted && editingCommentId !== comment.id"
                class="comment-actions"
              >
                <CommentThanksActions
                  :own="isOwnComment(comment)"
                  :deleted="comment.deleted"
                  :thanked="comment.thanked"
                  :sent="comment.sent"
                  :count="comment.thanksCount"
                  @thank="thankComment(comment)"
                  @send="offerCommentSend(comment)"
                />
                <button
                  v-if="isOwnComment(comment)"
                  type="button"
                  class="comment-action"
                  @click="startEdit(comment)"
                >
                  Edit
                </button>
                <button
                  v-if="isOwnComment(comment)"
                  type="button"
                  class="comment-action comment-action--danger"
                  @click="requestDeleteComment(comment.id)"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        </div>

        <CommentComposer
          :text="commentText"
          :posting="posting"
          :title-name="title.title"
          @update:text="commentText = $event"
          @update:open="commentSheetOpen = $event"
          @submit="postComment"
        />
      </section>

      <TmdbAttribution variant="compact" class="title-attr" />
    </div>

    <ShareTitleSheet
      v-if="shareOpen && title"
      :handle="authStore.user?.handle ?? null"
      :title-name="title.title"
      :media-type="title.mediaType"
      :tmdb-id="title.tmdbId"
      @close="closeTitleShare"
      @claim="goClaimHandle"
    />

    <RecommendCue
      v-if="recommendCueOpen && title"
      :title-name="title.title"
      @share="shareFromCue"
      @dismiss="recommendCueOpen = false"
    />

    <FavoritersSheet
      v-if="favoritersOpen && title"
      :people="suggesters"
      :initial-tab="tastePeopleTab"
      :recommend-count="title.recommendCount"
      :favorite-count="title.favoriteCount"
      @close="favoritersOpen = false"
      @open-profile="onOpenFavoriterProfile"
      @thank="thankPerson"
      @send="offerTitleSend"
    />

    <TitleActionDialogs
      :pending="pendingConfirm"
      :message="confirmMessage"
      :reason="leaveReason"
      :thank-all="thankAllCue"
      :thank-all-busy="thankAllBusy"
      @update:reason="leaveReason = $event"
      @cancel="cancelConfirm"
      @confirm="onConfirmAction"
      @cancel-thank-all="cancelThankAll"
      @confirm-thank-all="confirmThankAll"
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesStore } from "@/stores/favorites";
import { useCatalogStore } from "@/stores/catalog";
import { displayName, imdbTitleUrl, makeTitleId, normalizeCommentInput, type AchievementKind, type MediaType } from "@cinima/shared";
import type { TitleDetail, CommentDto, TitleSuggester } from "@cinima/shared";
import ExpandableText from "@/components/ExpandableText.vue";
import CommentComposer from "@/components/CommentComposer.vue";
import CommentThanksActions from "@/components/CommentThanksActions.vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import TitleActionDialogs from "@/components/TitleActionDialogs.vue";
import FavoritersSheet, { type TastePeopleTab } from "@/components/FavoritersSheet.vue";
import GoldGlowShell from "@/components/GoldGlowShell.vue";
import HeatMap from "@/components/HeatMap.vue";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import PosterImg from "@/components/PosterImg.vue";
import RecommendCue from "@/components/RecommendCue.vue";
import ShareTitleSheet from "@/components/ShareTitleSheet.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import TourSpotlight from "@/components/TourSpotlight.vue";
import { useTitleActionConfirm } from "@/composables/useTitleActionConfirm";
import { shouldOfferRecommendCue, TOUR_SPOTLIGHT } from "@/lib/guidedTour";
import { recommendCueDelayMs } from "@/lib/titleFlight";
import { watchlistButtonLabel } from "@/lib/titleActionLabels";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { useMarqueeStore } from "@/stores/marquee";
import { useTitleFlightStore } from "@/stores/titleFlight";
import { useUserSendStore } from "@/stores/userSend";
import { formatTitleRating, hasTitleRating } from "@/lib/titleRating";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { canPostComment } from "@/lib/commentComposer";

const route = useRoute();
const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();
const favoritesStore = useFavoritesStore();
const catalogStore = useCatalogStore();
const tour = useGuidedTourStore();
const titleFlight = useTitleFlightStore();
const {
  pendingConfirm,
  confirmMessage,
  leaveReason,
  thankAllCue,
  thankAllBusy,
  lastThankAllTitleId,
  cancelConfirm,
  cancelThankAll,
  confirmThankAll,
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
const commentSheetOpen = ref(false);
const editingCommentId = ref<number | null>(null);
const editText = ref("");
const savingEdit = ref(false);
const commentPendingDelete = ref<number | null>(null);
const suggesters = ref<TitleSuggester[]>([]);
const thankingAll = ref(false);
const favoritersOpen = ref(false);
const tastePeopleTab = ref<TastePeopleTab>("recommends");
const shareOpen = ref(false);
const recommendCueOpen = ref(false);
let recommendCueTimer: ReturnType<typeof setTimeout> | null = null;

function clearRecommendCueTimer() {
  if (recommendCueTimer == null) return;
  window.clearTimeout(recommendCueTimer);
  recommendCueTimer = null;
}

function offerRecommendCue(flew: boolean) {
  clearRecommendCueTimer();
  const delay = flew ? recommendCueDelayMs() : 0;
  if (delay === 0) {
    recommendCueOpen.value = true;
    return;
  }
  recommendCueTimer = window.setTimeout(() => {
    recommendCueOpen.value = true;
    recommendCueTimer = null;
  }, delay);
}
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

const toggleFavorite = async (origin?: MouseEvent) => {
  if (!title.value) return;
  await requestToggleFavorite(title.value.id, {
    title: title.value,
    isFavorited: title.value.favorited,
    onAdded: () => {
      if (!title.value) return;
      title.value.favorited = true;
      tour.reportAction("favorite");
      titleFlight.play({
        kind: "favorite",
        title: title.value,
        origin: origin ?? null,
      });
    },
  });
};

const toggleWatchlist = async (origin?: MouseEvent) => {
  if (!title.value) return;
  await requestToggleWatchlist(title.value.id, {
    title: title.value,
    isWatchlisted: title.value.watchlisted,
    onAdded: () => {
      if (!title.value) return;
      title.value.watchlisted = true;
      tour.reportAction("watchlist-add");
      titleFlight.play({
        kind: "watchlist",
        title: title.value,
        origin: origin ?? null,
      });
    },
  });
};

const onConfirmAction = async () => {
  await confirmPending({
    onUnfavorite: () => {
      if (!title.value) return;
      title.value.favorited = false;
      title.value.recommended = false;
      recommendCueOpen.value = false;
      clearRecommendCueTimer();
      tour.reportAction("unfavorite");
    },
    onRemoveFromWatchlist: () => {
      if (title.value) title.value.watchlisted = false;
      tour.reportAction("watchlist-remove");
    },
  });
};

const toggleRecommend = async (origin?: MouseEvent) => {
  if (!title.value?.favorited) return;
  const wasRecommended = title.value.recommended;
  try {
    if (wasRecommended) {
      await favoritesStore.clearRecommend(title.value.id);
      title.value.recommended = false;
      return;
    }
    await favoritesStore.setRecommend(title.value.id);
    title.value.recommended = true;
    tour.reportAction("recommend");
    const flew = titleFlight.play({
      kind: "recommend",
      title: title.value,
      origin: origin ?? null,
    });
    if (
      shouldOfferRecommendCue({
        tourActive: tour.active,
        wasRecommended,
      })
    ) {
      offerRecommendCue(flew);
    }
  } catch (err) {
    console.error("Recommend failed:", err);
    alert(err instanceof Error ? err.message : "Could not update Recommend");
  }
};

const openTitleShare = () => {
  shareOpen.value = true;
};

const shareFromCue = () => {
  recommendCueOpen.value = false;
  shareOpen.value = true;
};

const closeTitleShare = () => {
  shareOpen.value = false;
};

const postComment = async () => {
  if (!title.value || !canPostComment(commentText.value, posting.value)) return;
  const body = normalizeCommentInput(commentText.value);
  posting.value = true;
  try {
    await request("/comments", {
      method: "POST",
      body: JSON.stringify({
        titleId: title.value.id,
        body,
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

const isOwnComment = (comment: CommentDto) =>
  comment.walletAddress === meWallet.value;

const thankComment = async (comment: CommentDto) => {
  if (comment.thanked || isOwnComment(comment)) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: comment.walletAddress,
    handle: comment.handle,
    commentId: comment.id,
  });
};

const offerCommentSend = (comment: CommentDto) => {
  if (!comment.thanked || comment.sent) return;
  useUserSendStore().offer({
    kind: "comment",
    toWallet: comment.walletAddress,
    handle: comment.handle,
    commentId: comment.id,
  });
};

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
    const data = await request<{ thanked: number; earnedAchievements?: AchievementKind[] }>(
      "/thanks/all",
      {
        method: "POST",
        body: JSON.stringify({ titleId: title.value.id }),
      }
    );
    suggesters.value = suggesters.value.map((s) => ({ ...s, thanked: true }));
    if (data.earnedAchievements?.length) {
      useMarqueeStore().enqueue(data.earnedAchievements);
    }
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

const thankPerson = (person: TitleSuggester) => {
  if (!title.value || person.thanked) return;
  useUserSendStore().offer({
    kind: "title",
    toWallet: person.walletAddress,
    handle: person.handle,
    titleId: title.value.id,
  });
};

const offerTitleSend = (person: TitleSuggester) => {
  if (!title.value || !person.thanked || person.sent) return;
  useUserSendStore().offer({
    kind: "title",
    toWallet: person.walletAddress,
    handle: person.handle,
    titleId: title.value.id,
  });
};

watch(
  () => useUserSendStore().lastThanked,
  (thanked) => {
    if (!thanked) return;
    if (thanked.kind === "title") {
      suggesters.value = suggesters.value.map((s) =>
        s.walletAddress === thanked.toWallet ? { ...s, thanked: true } : s
      );
      return;
    }
    comments.value = comments.value.map((c) =>
      c.id === thanked.commentId
        ? {
            ...c,
            thanked: true,
            thanksCount: c.thanked ? c.thanksCount : c.thanksCount + 1,
          }
        : c
    );
  }
);

watch(
  lastThankAllTitleId,
  (id) => {
    if (!id || id !== title.value?.id) return;
    suggesters.value = suggesters.value.map((s) => ({ ...s, thanked: true }));
  }
);

watch(
  () => useUserSendStore().lastAttached,
  (attached) => {
    if (!attached) return;
    if (attached.kind === "title") {
      suggesters.value = suggesters.value.map((s) =>
        s.walletAddress === attached.toWallet ? { ...s, sent: true } : s
      );
    } else {
      comments.value = comments.value.map((c) =>
        c.id === attached.commentId ? { ...c, sent: true } : c
      );
    }
  }
);

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
  closeTitleShare();
  router.push({ name: "me" });
};

onMounted(() => {
  loadTitle();
});

onUnmounted(() => {
  clearRecommendCueTimer();
});
</script>

<style scoped>
.title-detail {
  position: relative;
  min-height: calc(
    100dvh - var(--app-brand-row, 2.75rem) - var(--vv-offset-top, 0px) -
      var(--bottom-tabs-inset)
  );
  display: flex;
  flex-direction: column;
}

.back-button,
.share-button {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  display: grid;
  place-content: center;
  -webkit-tap-highlight-color: transparent;
}

.back-button {
  position: fixed;
  z-index: 46;
  left: max(
    var(--column-pad, 1.25rem),
    calc((100vw - var(--column-max, 44rem)) / 2 + var(--column-pad, 1.25rem))
  );
  bottom: calc(var(--bottom-tabs-inset, 0px) + 0.55rem);
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1.5px solid color-mix(in oklch, var(--colors-white, #fff) 62%, transparent);
  box-shadow:
    0 0 0 2px color-mix(in oklch, var(--colors-white, #fff) 52%, transparent),
    0 0 12px 2px color-mix(in oklch, var(--colors-white, #fff) 38%, transparent);
}

.back-button[hidden] {
  display: none;
}

.back-button :deep(.nq-icon) {
  width: 24px;
  height: 24px;
}

.share-button {
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  margin-top: 0.05rem;
  color: var(--text-secondary);
}

.share-button :deep(.nq-icon) {
  width: 20px;
  height: 20px;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.content {
  padding: 1rem 0 3rem;
}

.poster-section {
  display: flex;
  align-items: stretch;
  gap: 1rem;
  margin-bottom: 1rem;
}

.poster-glow {
  flex: none;
  width: 10rem;
}

.poster-glow :deep(.gold-glow-content) {
  width: 100%;
  height: 15rem;
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

.poster-glow .poster {
  width: 100%;
  height: 100%;
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

.meta-title {
  display: flex;
  align-items: flex-start;
  gap: 0.25rem;
  min-width: 0;
}

.meta h2 {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
  max-width: calc(100% - 2.1rem);
  font-size: 1.05rem;
  line-height: 1.2;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
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
