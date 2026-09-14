<template>
  <Teleport to="body">
    <div
      v-if="shown"
      class="join-overlay-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-overlay-title"
    >
      <div class="join-overlay-panel nq-card">
        <p id="join-overlay-title" class="join-overlay-title">{{ title }}</p>
        <p class="join-overlay-sub">{{ sub }}</p>
        <p class="join-overlay-nim">{{ nim }}</p>
        <p class="join-overlay-unlock">{{ unlocked }}</p>
        <p class="join-overlay-achievement">{{ achievement }}</p>
        <button type="button" class="nq-pill-blue nq-pill-lg join-overlay-continue" @click="onContinue">
          Continue
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  JOIN_OVERLAY_NIM_LABEL,
  JOIN_OVERLAY_SUB,
  JOIN_OVERLAY_TITLE,
  JOIN_OVERLAY_UNLOCKED,
  achievementTitle,
} from "@cinima/shared";
import { useJoinOverlayStore } from "@/stores/joinOverlay";
import { useGuidedTourStore } from "@/stores/guidedTour";

const store = useJoinOverlayStore();
const tour = useGuidedTourStore();
const { open } = storeToRefs(store);
const onboarding = ref(false);
let poll: ReturnType<typeof setInterval> | null = null;

const title = JOIN_OVERLAY_TITLE;
const sub = JOIN_OVERLAY_SUB;
const nim = JOIN_OVERLAY_NIM_LABEL;
const unlocked = JOIN_OVERLAY_UNLOCKED;
const achievement = achievementTitle("joined-the-crew");

function readOnboarding() {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(".discover--onboarding, .discover--handle");
}

const shown = computed(() =>
  store.visible({
    onboarding: onboarding.value,
    tourActive: tour.active || tour.offering,
  })
);

watch(
  open,
  (isOpen) => {
    if (poll != null) {
      clearInterval(poll);
      poll = null;
    }
    if (!isOpen) return;
    onboarding.value = readOnboarding();
    poll = setInterval(() => {
      onboarding.value = readOnboarding();
    }, 250);
  },
  { immediate: true }
);

onUnmounted(() => {
  if (poll != null) clearInterval(poll);
});

function onContinue() {
  void store.ack();
}
</script>

<style scoped>
.join-overlay-modal {
  position: fixed;
  inset: 0;
  z-index: 96;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: transparent;
}

.join-overlay-panel {
  position: relative;
  width: min(100%, 22rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  padding: 1.6rem 1.3rem 1.3rem;
  text-align: center;
}

.join-overlay-title {
  margin: 0;
  font-size: clamp(1.25rem, 4vw, 1.55rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--text-primary);
}

.join-overlay-sub {
  margin: 0;
  font-size: 0.92rem;
  font-style: italic;
  line-height: 1.35;
  color: var(--text-secondary);
}

.join-overlay-nim {
  margin: 0.35rem 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--gold, #e5c158);
}

.join-overlay-unlock {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.join-overlay-achievement {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.join-overlay-continue {
  margin-top: 0.85rem;
}
</style>
