<template>
  <div class="me">
    <header class="page-header">
      <h1>Me</h1>
    </header>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="content">
      <div class="profile-section nq-card">
        <Identicon
          class="profile-avatar"
          :address="user?.walletAddress"
          :size="64"
          alt="Your Nimiq identicon"
        />
        <div class="profile-info">
          <h2>{{ displayName(user?.handle, user?.walletAddress || "") }}</h2>
          <p v-if="user?.handle" class="wallet">{{ abbreviateWallet(user.walletAddress) }}</p>
          <p v-if="heatmapMeta" class="stats">
            {{ heatmapMeta.followerCount }} followers · {{ heatmapMeta.followingCount }} following
          </p>
        </div>
      </div>

      <ActivityHeatmap v-if="heatmap.length" :days="heatmap" title="Your activity" />

      <div v-if="!user?.lifetimeUnlocked" class="lifetime-banner nq-card">
        <h3>Lifetime Unlock</h3>
        <p>Unlock all titles forever for {{ lifetimeNim }} NIM</p>
        <button @click="purchaseLifetime" :disabled="purchasing" class="nq-pill-white">
          {{ purchasing ? "Processing..." : "Unlock Lifetime" }}
        </button>
      </div>

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

      <section class="media-section">
        <h3>Recommends ({{ recommends.length }}/5)</h3>
        <div v-if="recommends.length === 0" class="empty">
          No gold Recommends yet — star standouts from a title
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in recommends"
            :key="title.id"
            class="media-item poster-press"
            @click="goToTitle(title.id)"
          >
            <span class="gold-badge" aria-hidden="true">★</span>
            <img
              v-if="title.posterUrl"
              :src="title.posterUrl"
              :alt="title.title"
            />
            <div v-else class="poster-placeholder">
              {{ title.title }}
            </div>
          </div>
        </div>
      </section>

      <section class="media-section">
        <h3>Favorites ({{ favorites.length }})</h3>
        <div v-if="favorites.length === 0" class="empty">
          No favorites yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in favorites"
            :key="title.id"
            class="media-item poster-press"
            @click="goToTitle(title.id)"
          >
            <span v-if="title.recommended" class="gold-badge" aria-hidden="true">★</span>
            <img
              v-if="title.posterUrl"
              :src="title.posterUrl"
              :alt="title.title"
            />
            <div v-else class="poster-placeholder">
              {{ title.title }}
            </div>
          </div>
        </div>
      </section>

      <section class="media-section">
        <h3>Unlocked ({{ unlocks.length }})</h3>
        <div v-if="unlocks.length === 0" class="empty">
          No unlocks yet
        </div>
        <div v-else class="media-grid">
          <div
            v-for="title in unlocks"
            :key="title.id"
            class="media-item poster-press"
            @click="goToTitle(title.id)"
          >
            <img
              v-if="title.posterUrl"
              :src="title.posterUrl"
              :alt="title.title"
            />
            <div v-else class="poster-placeholder">
              {{ title.title }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { usePayments } from "@/composables/usePayments";
import { useAuthStore } from "@/stores/auth";
import Identicon from "@/components/Identicon.vue";
import ActivityHeatmap from "@/components/ActivityHeatmap.vue";
import { LIFETIME_UNLOCK_NIM, LIFETIME_UNLOCK_LUNA, displayName, abbreviateWallet } from "@nimcharts/shared";
import type { HeatmapDay, MeResponse, PublicProfile, TitleSummary } from "@nimcharts/shared";

const router = useRouter();
const { request } = useApi();
const { sendPayment } = usePayments();
const authStore = useAuthStore();

const loading = ref(true);
const purchasing = ref(false);
const user = computed(() => authStore.user);
const favorites = ref<TitleSummary[]>([]);
const recommends = ref<TitleSummary[]>([]);
const unlocks = ref<TitleSummary[]>([]);
const shareUrl = ref<string | null>(null);
const needsHandlePrompt = ref(false);
const handleDraft = ref("");
const heatmap = ref<HeatmapDay[]>([]);
const heatmapMeta = ref<{ followerCount: number; followingCount: number } | null>(null);

const lifetimeNim = LIFETIME_UNLOCK_NIM;

const loadMe = async () => {
  loading.value = true;
  try {
    const data = await request<MeResponse>("/me");
    favorites.value = data.favorites;
    recommends.value = data.recommends || [];
    unlocks.value = data.unlocks;
    shareUrl.value = data.shareUrl;
    needsHandlePrompt.value = data.needsHandlePrompt;
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

const purchaseLifetime = async () => {
  purchasing.value = true;
  try {
    const hash = await sendPayment(LIFETIME_UNLOCK_LUNA, {
      type: "lifetime",
    });

    await request("/lifetime", {
      method: "POST",
      body: JSON.stringify({ txHash: hash }),
    });

    await authStore.checkSession();
    await loadMe();
  } catch (err) {
    console.error("Lifetime unlock failed:", err);
    alert("Failed to unlock lifetime access");
  } finally {
    purchasing.value = false;
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

.profile-section {
  display: flex;
  gap: 1rem;
  margin-bottom: 0;
  align-items: center;
}

.stats {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--border);
}

.profile-info {
  flex: 1;
}

.profile-info h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.wallet {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.lifetime-banner {
  background: var(--colors-blue-gradient);
  margin-bottom: 1rem;
  text-align: center;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lifetime-banner h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.lifetime-banner p {
  margin: 0 0 1rem 0;
  opacity: 0.9;
}

.share-section {
  margin-bottom: 1rem;
}

.share-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
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

.media-section {
  margin-bottom: 2rem;
}

.media-section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.75rem;
}

.media-item {
  position: relative;
  aspect-ratio: 2/3;
  background: var(--bg-surface);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.media-item:hover {
  transform: scale(1.05);
}

.media-item img {
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
  font-size: 0.8rem;
  color: var(--text-secondary);
}
</style>
