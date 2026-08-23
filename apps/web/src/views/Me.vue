<template>
  <div class="me">
    <div v-if="loading" class="loading">
      <NqSpinner />
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
        wallet-display="abbrev"
        :avatar-size="64"
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

      <ActivityHeatmap v-if="heatmap.length" :days="heatmap" title="Your activity" />

      <div v-if="needsHandlePrompt" class="handle-prompt nq-card">
        <h3>Claim a shareable handle</h3>
        <p>Soft NimConnect-style identity for your public favorites URL.</p>
        <div class="share-link">
          <input v-model="handleDraft" class="nq-input-box" placeholder="yourname" maxlength="24" />
          <button type="button" class="nq-pill-blue" @click="saveHandle">Save</button>
        </div>
      </div>

      <ProfileTaste
        :favorites="favorites"
        :recommends="recommends"
        @select="(title) => goToTitle(title.id)"
      />

      <TmdbAttribution variant="legal" />
    </div>

    <div
      v-if="xEditorOpen"
      class="x-modal"
      role="presentation"
      @click.self="xEditorOpen = false"
    >
      <div
        class="x-dialog nq-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="x-edit-title"
      >
        <button type="button" class="x-close" aria-label="Close" @click="xEditorOpen = false">
          <NqIcon name="cross" :size="20" />
        </button>
        <h2 id="x-edit-title">X</h2>
        <p>Optional public link on your share page.</p>
        <input
          v-model="xDraft"
          class="nq-input-box"
          placeholder="@handle"
          maxlength="16"
          autocomplete="off"
        />
        <button type="button" class="nq-pill-blue nq-pill-stretch" @click="saveXHandle(xDraft.trim())">
          Save
        </button>
        <button
          v-if="xHandle"
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          @click="clearXHandle"
        >
          Remove
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
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import NqIcon from "@/components/NqIcon.vue";
import NqSpinner from "@/components/NqSpinner.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import UserCard from "@/components/UserCard.vue";
import ShareLinkSheet from "@/components/ShareLinkSheet.vue";
import {
  displayName,
  profileShareCopy,
  profileShareDescription,
} from "@cinima/shared";
import type { HeatmapDay, MeResponse, PublicProfile, TitleSummary } from "@cinima/shared";

const router = useRouter();
const { request } = useApi();
const authStore = useAuthStore();

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
const xEditorOpen = ref(false);
const shareOpen = ref(false);

const sharePreview = computed(() => {
  if (!shareUrl.value || !user.value?.handle) return null;
  const imageUrl =
    recommends.value.find((t) => t.posterUrl)?.posterUrl ??
    favorites.value.find((t) => t.posterUrl)?.posterUrl ??
    null;
  return {
    url: shareUrl.value,
    headline: profileShareCopy(user.value.handle),
    description: profileShareDescription(recommends.value.length, favorites.value.length),
    imageUrl,
  };
});

const loadMe = async () => {
  loading.value = true;
  try {
    const data = await request<MeResponse>("/me");
    favorites.value = data.favorites;
    recommends.value = data.recommends || [];
    shareUrl.value = data.shareUrl;
    needsHandlePrompt.value = data.needsHandlePrompt;
    xHandle.value = data.xHandle;
    xDraft.value = data.xHandle ? `@${data.xHandle}` : "";
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
    loading.value = false;
  }
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
  if (handleDraft.value.trim().length < 3) return;
  await authStore.setHandle(handleDraft.value.trim());
  await loadMe();
};

const saveXHandle = async (value: string | null) => {
  await request("/me/x-handle", {
    method: "POST",
    body: JSON.stringify({ xHandle: value }),
  });
  xEditorOpen.value = false;
  await loadMe();
};

const clearXHandle = async () => {
  await saveXHandle(null);
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
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

.loading {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-secondary);
}

.content {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-btn.on {
  color: var(--text-primary);
}

.icon-btn :deep(.nq-icon) {
  width: 20px;
  height: 20px;
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
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
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

.x-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  display: flex;
  padding: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
