<template>
  <div class="me">
    <header class="page-header">
      <h1>Me</h1>
    </header>

    <div v-if="loading" class="loading">
      <NqSpinner />
    </div>

    <div v-else class="content">
      <UserCard
        v-if="user?.walletAddress"
        :wallet-address="user.walletAddress"
        :handle="displayName(user.handle, user.walletAddress)"
        :x-handle="xHandle"
        :follower-count="heatmapMeta?.followerCount"
        :following-count="heatmapMeta?.followingCount"
        wallet-display="abbrev"
        :avatar-size="64"
      />

      <ActivityHeatmap v-if="heatmap.length" :days="heatmap" title="Your activity" />

      <div v-if="shareUrl" class="share-section nq-card">
        <h3>Your Public Profile</h3>
        <div class="share-link">
          <input :value="shareUrl" readonly class="nq-input-box" />
          <button type="button" class="nq-pill-blue" @click="copyShareLink">Copy</button>
        </div>
      </div>

      <div v-else-if="needsHandlePrompt" class="handle-prompt nq-card">
        <h3>Claim a shareable handle</h3>
        <p>Soft NimConnect-style identity for your public favorites URL.</p>
        <div class="share-link">
          <input v-model="handleDraft" class="nq-input-box" placeholder="yourname" maxlength="24" />
          <button type="button" class="nq-pill-blue" @click="saveHandle">Save</button>
        </div>
      </div>

      <div v-if="shareUrl" class="share-section nq-card">
        <h3>X</h3>
        <p class="x-hint">Optional public link on your share page.</p>
        <div class="share-link">
          <input
            v-model="xDraft"
            class="nq-input-box"
            placeholder="@handle"
            maxlength="16"
            autocomplete="off"
          />
          <button type="button" class="nq-pill-blue" @click="saveXHandle">Save</button>
        </div>
      </div>

      <ProfileTaste
        :favorites="favorites"
        :recommends="recommends"
        :recommend-count-label="recommendCountLabel"
        @select="(title) => goToTitle(title.id)"
      />

      <section class="sources-section nq-card">
        <h3>Sources & terms</h3>
        <TmdbAttribution variant="legal" />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import NqSpinner from "@/components/NqSpinner.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import ProfileTaste from "@/components/ProfileTaste.vue";
import UserCard from "@/components/UserCard.vue";
import { displayName, MAX_RECOMMENDS } from "@nimcharts/shared";
import type { HeatmapDay, MeResponse, PublicProfile, TitleSummary } from "@nimcharts/shared";

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

const movieRecommendCount = computed(
  () => recommends.value.filter((t) => t.mediaType === "movie").length
);
const tvRecommendCount = computed(
  () => recommends.value.filter((t) => t.mediaType === "tv").length
);
const recommendCountLabel = computed(
  () =>
    `${movieRecommendCount.value}/${MAX_RECOMMENDS} movies · ${tvRecommendCount.value}/${MAX_RECOMMENDS} TV`
);

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

const copyShareLink = () => {
  if (shareUrl.value) {
    navigator.clipboard.writeText(shareUrl.value);
  }
};

const saveHandle = async () => {
  if (handleDraft.value.trim().length < 3) return;
  await authStore.setHandle(handleDraft.value.trim());
  await loadMe();
};

const saveXHandle = async () => {
  await request("/me/x-handle", {
    method: "POST",
    body: JSON.stringify({ xHandle: xDraft.value.trim() }),
  });
  await loadMe();
};

const goToTitle = (titleId: string) => {
  router.push({ name: "title", params: { id: titleId } });
};

onMounted(() => {
  loadMe();
});
</script>

<style scoped>
.me {
  min-height: 100%;
  padding-bottom: 2rem;
}

.page-header {
  padding: 1.5rem 1rem;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.loading {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.share-section {
  margin-bottom: 1rem;
}

.share-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.x-hint {
  margin: -0.5rem 0 0.75rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.share-link {
  display: flex;
  gap: 0.5rem;
}

.share-link input {
  flex: 1;
}

.handle-prompt {
  margin-bottom: 1rem;
  text-align: center;
  color: var(--text-secondary);
}

.handle-prompt p {
  margin: 0;
}

.sources-section h3 {
  margin: 0 0 0.85rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}
</style>
