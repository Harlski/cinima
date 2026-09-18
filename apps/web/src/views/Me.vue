<template>
  <div class="me">
    <div v-if="loading" class="tab-pane-wait">
      <LoadingWait />
    </div>

    <div v-else class="content">
      <UserCard
        v-if="user?.walletAddress"
        :wallet-address="user.walletAddress"
        :handle="displayName(user.handle, user.walletAddress)"
        :x-handle="xHandle"
        :show-x-link="false"
        :follower-count="heatmapMeta?.followerCount"
        :following-count="heatmapMeta?.followingCount"
        :achievement-count="achievementCount"
        :achievement-open="true"
        :recommends="recommends"
        :identicon-to="publicProfileTo"
        identicon-label="View Public Profile"
        @open-credits="openCredits"
      >
        <template #actions>
          <div class="card-actions">
            <button
              type="button"
              class="icon-btn"
              :class="{ on: !!xHandle }"
              aria-label="Update X handle"
              @click="openXEditor"
            >
              <NqIcon name="logos-twitter-mono" :size="20" />
            </button>
            <button
              type="button"
              class="icon-btn"
              :class="{ on: shareOpen }"
              aria-label="Share profile"
              @click="openShare"
            >
              <NqIcon name="link" :size="20" />
            </button>
          </div>
        </template>
      </UserCard>

      <ActivityHeatmap
        v-if="ACTIVITY_UI_VISIBLE && heatmap.length"
        :days="heatmap"
        title="Your activity"
      />

      <div v-if="needsHandlePrompt" class="handle-prompt nq-card">
        <h3>Claim a shareable handle</h3>
        <p>Your public Cinima identity, stored on this server and tied to your wallet.</p>
        <div class="share-link">
          <input
            v-model="handleDraft"
            class="nq-input-box"
            placeholder="yourname"
            maxlength="24"
            :disabled="handleBusy"
            :aria-busy="handleBusy"
          />
          <button
            type="button"
            class="nq-pill-blue"
            :disabled="handleBusy"
            :aria-busy="handleBusy"
            @click="saveHandle"
          >
            {{ acceptedWaitLabel("Save", handleBusy) }}
          </button>
        </div>
      </div>

      <ProfileTaste
        :favorites="favorites"
        :recommends="recommends"
        @select="(title) => goToTitle(title.id)"
      />

      <ProfileComments v-if="user?.walletAddress" :wallet-address="user.walletAddress" />

      <section v-if="receivedItems.length" class="received">
        <h2>{{ receivedHeading }}</h2>
        <ul class="received-list">
          <li
            v-for="item in receivedItems"
            :key="`${item.kind}-${item.id}`"
            class="received-event"
          >
            <RouterLink
              v-if="item.kind !== 'join'"
              class="received-who"
              :to="{ name: 'user', params: { wallet: item.fromWallet } }"
              :aria-label="displayName(item.fromHandle, item.fromWallet)"
            >
              <Identicon :address="item.fromWallet" :size="32" alt="" />
            </RouterLink>
            <div class="received-body">
              <RouterLink
                v-if="item.kind !== 'join'"
                class="received-title"
                :to="{ name: 'title', params: { id: item.titleId } }"
              >
                {{ item.titleName }}
              </RouterLink>
              <p v-if="item.kind === 'join'" class="received-title">{{ receivedHow(item.kind) }}</p>
              <p v-else class="received-how">{{ receivedHow(item.kind) }}</p>
              <button
                v-if="item.kind !== 'join' && item.sendMemo"
                type="button"
                class="received-memo"
                :class="{ 'is-open': isMemoOpen(item) }"
                :aria-expanded="isMemoOpen(item)"
                @click="toggleMemo(item)"
              >
                {{ item.sendMemo }}
              </button>
            </div>
            <span v-if="nimWatchParts(item).length" class="received-nim">
              <template v-for="(part, i) in nimWatchParts(item)" :key="i">
                <a
                  v-if="part.href"
                  class="received-nim-link"
                  :href="part.href ?? undefined"
                  target="_blank"
                  rel="noopener noreferrer"
                >{{ part.label }}</a>
                <span v-else>{{ part.label }}</span>
              </template>
            </span>
          </li>
        </ul>
      </section>

      <div class="tour-replay">
        <button
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          data-tour="take-guided-tour"
          @click="startGuidedTour"
        >
          Take the tour
        </button>
      </div>

      <div v-if="showStudio" class="studio-entry">
        <button
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          @click="router.push({ name: 'studio' })"
        >
          Studio
        </button>
      </div>

      <TmdbAttribution variant="legal" />
    </div>

    <div
      v-if="xEditorOpen"
      class="x-modal"
      data-scroll-trap
      role="presentation"
      @click.self="xEditorOpen = false"
    >
      <div
        class="x-dialog nq-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="x-edit-title"
      >
        <div class="popup-header">
          <h2 id="x-edit-title">X</h2>
          <button type="button" class="popup-close" aria-label="Close" @click="xEditorOpen = false">
            <NqIcon name="cross" :size="20" />
          </button>
        </div>
        <p>Optional public link on your share page.</p>
        <input
          v-model="xDraft"
          class="nq-input-box"
          placeholder="@handle"
          maxlength="16"
          autocomplete="off"
          :disabled="xBusy"
        />
        <button
          type="button"
          class="nq-pill-blue nq-pill-stretch"
          :disabled="xBusy"
          :aria-busy="xBusy"
          @click="saveXHandle(xDraft.trim())"
        >
          {{ acceptedWaitLabel("Save", xBusy) }}
        </button>
        <button
          v-if="xHandle"
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          :disabled="xBusy"
          :aria-busy="xBusy"
          @click="clearXHandle"
        >
          {{ acceptedWaitLabel("Remove", xBusy) }}
        </button>
      </div>
    </div>
    <ShareLinkSheet
      v-if="shareOpen && sharePreview"
      title="Share profile"
      :headline="sharePreview.headline"
      :description="sharePreview.description"
      :url="sharePreview.url"
      :image-url="sharePreview.imageUrl"
      @close="shareOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import Identicon from "@/components/Identicon.vue";
import NqIcon from "@/components/NqIcon.vue";
import LoadingWait from "@/components/LoadingWait.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import ProfileComments from "@/components/ProfileComments.vue";
import UserCard from "@/components/UserCard.vue";
import ShareLinkSheet from "@/components/ShareLinkSheet.vue";
import { useMarqueeStore } from "@/stores/marquee";
import { studioEntryVisible } from "@/lib/studio";
import {
  ACTIVITY_UI_VISIBLE,
  RECEIVED_LIST_HEADING,
  displayName,
  receivedHow,
  receivedNimWatchParts,
  type HeatmapDay,
  type MeResponse,
  type PublicProfile,
  type ReceivedItem,
  type TitleSummary,
} from "@cinima/shared";
import { siteOrigin } from "@/lib/siteMeta";
import { profileShareSheetPreview } from "@/lib/profileShare";
import { acceptedWaitLabel } from "@/lib/acceptedWait";
import { useGuidedTourStore } from "@/stores/guidedTour";

const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();
const tour = useGuidedTourStore();

const loading = ref(true);
const user = computed(() => authStore.user);
const favorites = ref<TitleSummary[]>([]);
const recommends = ref<TitleSummary[]>([]);
const shareUrl = ref<string | null>(null);
const needsHandlePrompt = ref(false);
const handleDraft = ref("");
const xDraft = ref("");
const xHandle = ref<string | null>(null);
const heatmap = ref<HeatmapDay[]>([]);
const heatmapMeta = ref<{ followerCount: number; followingCount: number } | null>(null);
const achievementCount = ref(0);
const xEditorOpen = ref(false);
const shareOpen = ref(false);
const handleBusy = ref(false);
const xBusy = ref(false);
const receivedItems = ref<ReceivedItem[]>([]);
const receivedHeading = RECEIVED_LIST_HEADING;
const openMemos = ref(new Set<string>());

const showStudio = computed(() => studioEntryVisible(user.value?.walletAddress));

const publicProfileTo = computed(() => {
  const handle = user.value?.handle?.trim();
  if (!handle) return null;
  return { name: "public" as const, params: { username: handle } };
});

function memoKey(item: ReceivedItem) {
  return `${item.kind}-${item.id}`;
}

function isMemoOpen(item: ReceivedItem) {
  return openMemos.value.has(memoKey(item));
}

function toggleMemo(item: ReceivedItem) {
  const key = memoKey(item);
  const next = new Set(openMemos.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  openMemos.value = next;
}

function nimWatchParts(item: ReceivedItem) {
  return receivedNimWatchParts({
    rewardNim: item.rewardNim,
    sendNim: item.sendNim,
    rewardTxHash: item.kind === "join" ? null : item.rewardTxHash,
    sendTxHash: item.sendTxHash,
  });
}

const sharePreview = computed(() => {
  if (!shareUrl.value || !user.value?.handle) return null;
  return profileShareSheetPreview({
    origin: siteOrigin,
    handle: user.value.handle,
    shareUrl: shareUrl.value,
  });
});

const loadMe = async (opts?: { quiet?: boolean }) => {
  if (!opts?.quiet) loading.value = true;
  try {
    const data = await request<MeResponse>("/me");
    favorites.value = data.favorites;
    recommends.value = data.recommends || [];
    shareUrl.value = data.shareUrl;
    needsHandlePrompt.value = data.needsHandlePrompt;
    xHandle.value = data.xHandle;
    xDraft.value = data.xHandle ? `@${data.xHandle}` : "";
    achievementCount.value = data.achievementCount ?? 0;
    if (data.unseenAchievements?.length) {
      useMarqueeStore().enqueue(data.unseenAchievements);
    }
    try {
      const received = await request<{ items: ReceivedItem[] }>("/me/received");
      receivedItems.value = received.items;
    } catch {
      receivedItems.value = [];
    }
    if (authStore.user?.walletAddress) {
      try {
        const profile = await request<PublicProfile>(
          `/users/${encodeURIComponent(authStore.user.walletAddress)}`
        );
        heatmap.value = profile.heatmap;
        heatmapMeta.value = {
          followerCount: profile.followerCount,
          followingCount: profile.followingCount,
        };
      } catch {
        heatmap.value = [];
        heatmapMeta.value = null;
      }
    }
  } finally {
    if (!opts?.quiet) loading.value = false;
  }
};

const openCredits = () => {
  if (!user.value?.walletAddress) return;
  router.push({ name: "credits", params: { wallet: user.value.walletAddress } });
};

const openXEditor = () => {
  xDraft.value = xHandle.value ? `@${xHandle.value}` : "";
  xEditorOpen.value = true;
};

const openShare = () => {
  if (!shareUrl.value) {
    needsHandlePrompt.value = true;
    return;
  }
  shareOpen.value = true;
};

const saveHandle = async () => {
  if (handleBusy.value) return;
  if (handleDraft.value.trim().length < 3) return;
  handleBusy.value = true;
  try {
    await authStore.setHandle(handleDraft.value.trim());
    await loadMe({ quiet: true });
  } finally {
    handleBusy.value = false;
  }
};

const saveXHandle = async (value: string | null) => {
  if (xBusy.value) return;
  xBusy.value = true;
  try {
    await request("/me/x-handle", {
      method: "POST",
      body: JSON.stringify({ xHandle: value }),
    });
    xEditorOpen.value = false;
    await loadMe({ quiet: true });
  } finally {
    xBusy.value = false;
  }
};

const clearXHandle = async () => {
  await saveXHandle(null);
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

const startGuidedTour = () => {
  tour.offerFromMe();
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") xEditorOpen.value = false;
};

onMounted(() => {
  loadMe();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.me {
  min-height: 100%;
  padding-bottom: 2rem;
}

.content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-btn.on {
  color: var(--text-primary);
}

.icon-btn :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}

.handle-prompt {
  text-align: center;
  color: var(--text-secondary);
}

.handle-prompt h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.handle-prompt p {
  margin: 0 0 0.75rem;
}

.received {
  padding: 0 1rem;
}

.received h2 {
  margin: 0 0 0.65rem;
  font-size: 1.1rem;
}

.received-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.received-event {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.45rem 0.65rem;
  line-height: 1.25;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
}

.received-event :deep(.identicon) {
  flex-shrink: 0;
}

.received-who {
  display: flex;
  flex-shrink: 0;
  border-radius: 50%;
  line-height: 0;
  color: inherit;
  text-decoration: none;
}

.received-who:hover {
  text-decoration: none;
}

.received-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.received-title {
  margin: 0;
  font-weight: 650;
  font-size: 0.88rem;
  line-height: 1.25;
  color: var(--text-primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.received-how {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.received-memo {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.78rem;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  overflow: hidden;
}

.received-memo.is-open {
  display: block;
  -webkit-line-clamp: unset;
  line-clamp: unset;
  overflow: visible;
  white-space: normal;
}

.received-nim {
  flex-shrink: 0;
  align-self: center;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--gold, #e5c158);
  white-space: nowrap;
}

.received-nim-link {
  color: inherit;
  font: inherit;
  font-weight: inherit;
  text-decoration: none;
}

.received-nim-link:hover,
.received-nim-link:focus-visible {
  text-decoration: underline;
}

.tour-replay,
.studio-entry {
  padding: 0 1rem;
}

.share-link {
  display: flex;
  gap: 0.5rem;
}

.share-link input {
  flex: 1;
}

.x-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: transparent;
}

.x-dialog {
  position: relative;
  width: min(100%, 22rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.35rem 1.25rem 1.25rem;
}

.x-dialog h2 {
  margin: 0;
  font-size: 1.2rem;
}

.x-dialog p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}
</style>
