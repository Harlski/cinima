<template>
  <div class="cue-lab">
    <div class="content">
      <h1>Cue lab</h1>
      <p class="lede">
        Preview Marquee, Recommend cue, Guided tour, Welcome, and product modals
        without walking the product flow. Previews are local; they do not award
        Achievements.
      </p>

      <section class="nq-card block">
        <h2>Marquee</h2>
        <p class="hint">Slides down from the brand header. Queue all to see stacking.</p>
        <div class="actions">
          <button
            v-for="kind in marqueeKinds"
            :key="kind"
            type="button"
            class="nq-pill-secondary"
            @click="previewMarquee(kind)"
          >
            {{ achievementTitle(kind) }}
          </button>
          <button type="button" class="nq-pill-gold" @click="previewAllMarquees">
            Queue all
          </button>
        </div>
      </section>

      <section
        v-for="group in overlayGroups"
        :key="group.group"
        class="nq-card block"
      >
        <h2>{{ group.group }}</h2>
        <p v-if="group.group === 'Guided tour'" class="hint">
          Offer and skipped notice overlay here. Start tour runs the real walkthrough
          and leaves this screen.
        </p>
        <div class="actions">
          <button
            v-for="overlay in group.overlays"
            :key="overlay.id"
            type="button"
            class="nq-pill-secondary"
            @click="previewOverlay(overlay.id)"
          >
            {{ overlay.label }}
          </button>
        </div>
      </section>
    </div>

    <RecommendCue
      v-if="recommendCueOpen"
      :title-name="sampleTitle.title"
      @share="onRecommendCueShare"
      @dismiss="recommendCueOpen = false"
    />

    <WelcomeOverlay
      :open="welcomeOpen"
      :wallet-address="welcomeWallet"
      :message="welcomeText"
    />

    <ConfirmDialog
      v-if="confirmOpen"
      :message="confirmMessage"
      @cancel="confirmOpen = false"
      @confirm="confirmOpen = false"
    />

    <PayOnlyGateModal
      v-if="payGateOpen"
      :already-installed-url="payUrl"
      @close="payGateOpen = false"
    />

    <PayTitleModal
      v-if="payTitleOpen"
      :title="sampleTitle"
      :pay-url="payUrl"
      @close="payTitleOpen = false"
    />

    <ShareLinkSheet
      v-if="shareOpen"
      title="Share title"
      headline="Check out Fight Club"
      description="ada wants you to see this on Cinima."
      :url="shareUrl"
      :image-url="sampleTitle.posterUrl"
      @close="shareOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { achievementTitle, CREATOR_WALLET_DISPLAY, type AchievementKind } from "@cinima/shared";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import PayOnlyGateModal from "@/components/PayOnlyGateModal.vue";
import PayTitleModal from "@/components/PayTitleModal.vue";
import RecommendCue from "@/components/RecommendCue.vue";
import ShareLinkSheet from "@/components/ShareLinkSheet.vue";
import WelcomeOverlay from "@/components/WelcomeOverlay.vue";
import {
  cueLabMarqueeKinds,
  cueLabOverlayGroups,
  type CueLabOverlayId,
} from "@/lib/cueLab";
import {
  initialTourRuntime,
  TOUR_COMMUNITY_FALLBACK_TITLE,
} from "@/lib/guidedTour";
import { payOpenHttpsUrl } from "@/lib/payLinks";
import { siteOrigin } from "@/lib/siteMeta";
import { WELCOME_HOLD_MS, welcomeMessage } from "@/lib/welcome";
import { useAuthStore } from "@/stores/auth";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { useMarqueeStore } from "@/stores/marquee";

const marquee = useMarqueeStore();
const tour = useGuidedTourStore();
const auth = useAuthStore();

const marqueeKinds = cueLabMarqueeKinds();
const overlayGroups = cueLabOverlayGroups();
const sampleTitle = TOUR_COMMUNITY_FALLBACK_TITLE;
const payUrl = payOpenHttpsUrl();
const shareUrl = `${siteOrigin}/ada/t/movie/550`;
const confirmMessage = "Remove Fight Club from Favorites?";

const recommendCueOpen = ref(false);
const welcomeOpen = ref(false);
const welcomeReturning = ref(false);
const confirmOpen = ref(false);
const payGateOpen = ref(false);
const payTitleOpen = ref(false);
const shareOpen = ref(false);
let welcomeTimer: ReturnType<typeof setTimeout> | null = null;

const welcomeWallet = computed(
  () => auth.user?.walletAddress || CREATOR_WALLET_DISPLAY
);

const welcomeText = computed(() =>
  welcomeMessage({
    returning: welcomeReturning.value,
    handle: welcomeReturning.value ? auth.user?.handle || "ada" : null,
  })
);

function clearWelcomeTimer() {
  if (welcomeTimer == null) return;
  clearTimeout(welcomeTimer);
  welcomeTimer = null;
}

function closeLocalOverlays() {
  clearWelcomeTimer();
  recommendCueOpen.value = false;
  welcomeOpen.value = false;
  confirmOpen.value = false;
  payGateOpen.value = false;
  payTitleOpen.value = false;
  shareOpen.value = false;
}

function showWelcome(returning: boolean) {
  welcomeReturning.value = returning;
  welcomeOpen.value = true;
  welcomeTimer = setTimeout(() => {
    welcomeOpen.value = false;
    welcomeTimer = null;
  }, WELCOME_HOLD_MS);
}

onUnmounted(() => {
  clearWelcomeTimer();
});

function previewMarquee(kind: AchievementKind) {
  closeLocalOverlays();
  marquee.enqueue([kind]);
}

function previewAllMarquees() {
  closeLocalOverlays();
  marquee.enqueue(marqueeKinds);
}

function onRecommendCueShare() {
  recommendCueOpen.value = false;
  shareOpen.value = true;
}

function previewOverlay(id: CueLabOverlayId) {
  closeLocalOverlays();
  if (id !== "tour-offer" && id !== "tour-skip-notice" && id !== "tour-start") {
    tour.skipNotice = false;
  }

  if (id === "recommend-cue") {
    recommendCueOpen.value = true;
    return;
  }
  if (id === "welcome") {
    showWelcome(false);
    return;
  }
  if (id === "welcome-back") {
    showWelcome(true);
    return;
  }
  if (id === "tour-offer") {
    tour.skipNotice = false;
    tour.showOffer({ persistDecline: false });
    return;
  }
  if (id === "tour-skip-notice") {
    tour.runtime = initialTourRuntime();
    tour.skipNotice = true;
    return;
  }
  if (id === "tour-start") {
    tour.beginTour();
    return;
  }
  if (id === "confirm") {
    confirmOpen.value = true;
    return;
  }
  if (id === "pay-only-gate") {
    payGateOpen.value = true;
    return;
  }
  if (id === "pay-title") {
    payTitleOpen.value = true;
    return;
  }
  if (id === "share-sheet") {
    shareOpen.value = true;
  }
}
</script>

<style scoped>
.cue-lab {
  min-height: 100%;
  padding-bottom: 2rem;
}

.content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

h1 {
  margin: 0;
  font-size: 1.35rem;
}

.lede,
.hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.hint {
  font-size: 0.85rem;
}

.block {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.block h2 {
  margin: 0;
  font-size: 1rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
