<template>
  <Teleport to="body">
    <!-- Opt-in after Favorites onboarding -->
    <div
      v-if="tour.offering"
      class="tour-offer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-offer-title"
    >
      <div class="tour-offer-card nq-card">
        <h2 id="tour-offer-title">Take a quick tour?</h2>
        <p>
          A short walk through Watchlist, Search, Recommends, and finding people
          to follow.
        </p>
        <button type="button" class="nq-pill-blue nq-pill-stretch" @click="onAccept">
          Let's go
        </button>
        <button
          type="button"
          class="nq-pill-secondary nq-pill-stretch"
          @click="tour.declineOffer()"
        >
          Not now
        </button>
      </div>
    </div>

    <!-- Active coach card -->
    <div
      v-else-if="tour.active && step && step.id === 'tour-done'"
      class="tour-done"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-done-title"
    >
      <div class="tour-done-card nq-card">
        <h2 id="tour-done-title">{{ step.title }}</h2>
        <p>{{ step.body }}</p>
        <ul class="tour-feedback" aria-label="Contact Cinima">
          <li v-for="channel in feedbackChannels" :key="channel.name">
            <a
              v-if="channel.href"
              class="tour-feedback-link"
              :href="channel.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="channel.name"
            >
              <NqIcon :name="channel.icon" :size="18" />
              <span>{{ channel.name }}</span>
            </a>
            <span
              v-else
              class="tour-feedback-link tour-feedback-link--pending"
              role="img"
              :aria-label="`${channel.name}, no link yet`"
            >
              <NqIcon :name="channel.icon" :size="18" />
              <span>{{ channel.name }}</span>
            </span>
          </li>
        </ul>
        <button
          type="button"
          class="nq-pill-blue nq-pill-stretch"
          @click="onPrimary"
        >
          {{ primaryLabel }}
        </button>
      </div>
    </div>

    <div
      v-else-if="tour.active && step"
      class="tour-coach"
      :class="`tour-coach--${coachPlacement}`"
      role="status"
      aria-live="polite"
    >
      <div class="tour-coach-card nq-card">
        <div class="tour-coach-top">
          <p class="tour-coach-step">
            {{ tour.stepIndex + 1 }} / {{ stepCount }}
          </p>
          <button type="button" class="tour-coach-skip" @click="tour.skip()">
            Skip tour
          </button>
        </div>
        <h3>{{ step.title }}</h3>
        <p>{{ step.body }}</p>
        <p v-if="step.actionText" class="tour-coach-action">{{ step.actionText }}</p>
        <button
          v-if="showPrimary"
          type="button"
          class="nq-pill-blue nq-pill-stretch"
          @click="onPrimary"
        >
          {{ primaryLabel }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import NqIcon from "@/components/NqIcon.vue";
import { useGuidedTourStore } from "@/stores/guidedTour";
import { payGateSocial } from "@/lib/contact";
import {
  GUIDED_TOUR_STEPS,
  TOUR_CREATOR_WALLET,
  tourCoachPlacement,
  tourStepPrimaryLabel,
  tourStepShowsPrimaryButton,
} from "@/lib/guidedTour";

const tour = useGuidedTourStore();
const { step } = storeToRefs(tour);
const router = useRouter();

const stepCount = GUIDED_TOUR_STEPS.length;
const feedbackChannels = payGateSocial;

const coachPlacement = computed(() => tourCoachPlacement(step.value));

const showPrimary = computed(() => tourStepShowsPrimaryButton(step.value));

const primaryLabel = computed(() => tourStepPrimaryLabel(step.value));

function normalizeRouteWallet(wallet: string) {
  return wallet.replace(/\s+/g, "").toUpperCase();
}

function onAccept() {
  tour.acceptOffer();
}

function onPrimary() {
  tour.next();
}

watch(
  () => ({
    phase: tour.phase,
    stepIndex: tour.stepIndex,
    titleId: tour.tourTitleId,
  }),
  async ({ phase }) => {
    if (phase !== "active") return;
    const s = tour.step;
    if (!s?.routeName) return;

    if (s.routeName === "title" && s.useTourTitle) {
      const id = tour.tourTitleId;
      if (!id) return;
      if (router.currentRoute.value.name === "title" &&
          String(router.currentRoute.value.params.id) === id) {
        return;
      }
      await router.push({ name: "title", params: { id } });
      return;
    }

    if (s.routeName === "user" && s.useCreatorWallet) {
      const wallet = TOUR_CREATOR_WALLET;
      const current = normalizeRouteWallet(
        String(router.currentRoute.value.params.wallet || "")
      );
      if (router.currentRoute.value.name === "user" && current === wallet) {
        return;
      }
      await router.push({ name: "user", params: { wallet } });
      return;
    }

    if (router.currentRoute.value.name === s.routeName) return;
    await router.push({ name: s.routeName });
  },
  { immediate: true }
);
</script>

<style scoped>
.tour-offer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 40%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.tour-offer-card {
  position: relative;
  overflow: hidden;
  width: min(100%, 22rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.35rem 1.25rem 1.2rem;
  text-align: center;
  background: var(--bg-surface, var(--colors-neutral-50));
}

.tour-offer-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("../assets/hex-pattern.svg");
  background-repeat: repeat;
  background-size: 5.25rem 4.5rem;
  background-position: 0 0;
  opacity: 0.07;
}

.tour-offer-card > * {
  position: relative;
  z-index: 1;
}

.tour-offer-card h2 {
  margin: 0;
  font-size: 1.25rem;
}

.tour-offer-card p {
  margin: 0 0 0.35rem;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.tour-done {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: color-mix(in oklch, var(--colors-neutral) 40%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.tour-done-card {
  position: relative;
  overflow: hidden;
  width: min(100%, 22rem);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.35rem 1.25rem 1.2rem;
  text-align: center;
  background: var(--bg-surface, var(--colors-neutral-50));
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
}

.tour-done-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("../assets/hex-pattern.svg");
  background-repeat: repeat;
  background-size: 5.25rem 4.5rem;
  background-position: 0 0;
  opacity: 0.07;
}

.tour-done-card > * {
  position: relative;
  z-index: 1;
}

.tour-done-card h2 {
  margin: 0;
  font-size: 1.25rem;
}

.tour-done-card > p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.tour-coach {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 0 0.85rem;
  pointer-events: none;
}

/* Sit just above the tab bar (default). */
.tour-coach--bottom {
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px) + 0.65rem);
}

/*
 * Bottom-tab glow steps: pin the card in the middle of the content band
 * so it never covers the tab glow and stays clear of the brand header.
 */
.tour-coach--top {
  top: calc(2.75rem + env(safe-area-inset-top, 0px));
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
  align-items: center;
}

.tour-coach-card {
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  width: min(100%, 24rem);
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.9rem 1rem 1rem;
  background: var(--bg-surface, var(--colors-neutral-50));
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
}

.tour-coach-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: url("../assets/hex-pattern.svg");
  background-repeat: repeat;
  background-size: 5.25rem 4.5rem;
  background-position: 0 0;
  opacity: 0.07;
}

.tour-coach-card > * {
  position: relative;
  z-index: 1;
}

.tour-coach-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tour-coach-step {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.tour-coach-skip {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tour-coach-card h3 {
  margin: 0;
  font-size: 1.05rem;
}

.tour-coach-card p {
  margin: 0 0 0.25rem;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.tour-coach-card p.tour-coach-action {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--gold);
}

.tour-feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin: 0.15rem 0 0.35rem;
  padding: 0;
  list-style: none;
}

.tour-feedback-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  background: var(--colors-neutral-200);
  color: var(--text-primary);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
}

.tour-feedback-link:hover {
  background: var(--colors-neutral-300);
}

.tour-feedback-link--pending {
  opacity: 0.55;
  color: var(--text-secondary);
}

.tour-feedback-link :deep(.nq-icon) {
  width: 18px;
  height: 18px;
}
</style>
