<template>
  <div class="landing">
    <AppBrandHeader fixed />

    <div class="landing-main">
      <div class="landing-stack">
        <p class="landing-kicker">{{ landingCopy.kicker }}</p>
        <h1 class="landing-title">{{ landingCopy.title }}</h1>
        <p class="landing-lead">{{ landingCopy.lead }}</p>

        <TitleMarquee class="landing-marquee" />

        <button
          v-if="inPay"
          type="button"
          class="landing-enter"
          :disabled="entering"
          :aria-label="entering ? 'Entering Cinima' : 'Enter Cinima'"
          @click="enterCinima"
        >
          <template v-if="entering">Entering…</template>
          <template v-else>
            <span class="landing-enter-prefix" aria-hidden="true">Enter</span>
            <BrandWordmark size="sm" accent aria-hidden="true" />
          </template>
        </button>
        <button
          v-else
          type="button"
          class="landing-enter"
          :aria-label="landingCopy.ctaExplore"
          @click="payOnlyOpen = true"
        >
          <span class="landing-enter-prefix" aria-hidden="true">Explore</span>
          <BrandWordmark size="sm" accent aria-hidden="true" />
        </button>

        <SocialPlaceholders class="landing-social" />
      </div>

      <TmdbAttribution variant="compact" class="landing-attr" />
    </div>

    <WelcomeOverlay
      :open="welcomeOpen"
      :wallet-address="welcomeWallet"
      :message="welcomeText"
      :force-pick-enabled="forcePickEnabled"
      @force-pick="forceFavoritesPick"
    />

    <PayOnlyGateModal
      v-if="payOnlyOpen"
      :already-installed-url="payUrl"
      @close="payOnlyOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import BrandWordmark from "@/components/BrandWordmark.vue";
import PayOnlyGateModal from "@/components/PayOnlyGateModal.vue";
import SocialPlaceholders from "@/components/SocialPlaceholders.vue";
import TitleMarquee from "@/components/TitleMarquee.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import WelcomeOverlay from "@/components/WelcomeOverlay.vue";
import { landingCopy } from "@/lib/contact";
import { payOpenSchemeUrl } from "@/lib/payLinks";
import { detectNimiqPay, isNimiqPay, isNimiqPayUserAgent } from "@/lib/nimiqPay";
import {
  FORCE_FAVORITES_PICK_QUERY,
  WELCOME_FADE_MS,
  WELCOME_HOLD_MS,
  armForceOnboardingFlow,
  canForceFavoritesPick,
  isReturningUser,
  sleep,
  welcomeMessage,
} from "@/lib/welcome";
import { takePostAuthPath } from "@/lib/postAuthPath";
import { useAuthStore } from "@/stores/auth";
import { useGuidedTourStore } from "@/stores/guidedTour";

const auth = useAuthStore();
const tour = useGuidedTourStore();
const router = useRouter();

const inPay = ref(isNimiqPay() || isNimiqPayUserAgent());
const entering = ref(false);
const payOnlyOpen = ref(false);
const welcomeOpen = ref(false);
const welcomeWallet = ref("");
const welcomeText = ref<ReturnType<typeof welcomeMessage>>("Welcome!");
const forcePickEnabled = canForceFavoritesPick();

const payUrl = computed(() => payOpenSchemeUrl());

let cancelled = false;
/** Bumped to cancel an in-flight welcome hold (e.g. force-pick). */
let enterGeneration = 0;

onMounted(async () => {
  // Late host injection: flip CTA to Enter without auto-booting.
  if (!inPay.value && (await detectNimiqPay({ waitMs: 1_500 }))) {
    if (!cancelled) inPay.value = true;
  }
});

onUnmounted(() => {
  cancelled = true;
});

/**
 * Connect on Landing first. After auth, show Welcome / Welcome Back,
 * then enter the stashed deep link (e.g. title) or Discover.
 */
const enterCinima = async () => {
  if (entering.value) return;
  entering.value = true;
  const gen = ++enterGeneration;
  const hadToken = !!auth.token;
  try {
    await auth.boot();
    if (cancelled || gen !== enterGeneration) return;
    if (!auth.user) return;

    welcomeWallet.value = auth.user.walletAddress;
    welcomeText.value = welcomeMessage({
      returning: isReturningUser({
        hadToken,
        handle: auth.user.handle,
        favoriteCount: auth.user.favoriteCount,
      }),
      handle: auth.user.handle,
    });
    welcomeOpen.value = true;
    await sleep(WELCOME_HOLD_MS);
    if (cancelled || gen !== enterGeneration) return;

    welcomeOpen.value = false;
    await sleep(WELCOME_FADE_MS);
    if (cancelled || gen !== enterGeneration) return;

    const pendingPath = takePostAuthPath();
    if (pendingPath) {
      await router.replace(pendingPath);
    } else {
      await router.replace({ name: "discover" });
    }
  } finally {
    if (!cancelled && gen === enterGeneration) entering.value = false;
  }
};

/** Local / demo: tap welcome identicon → full onboarding (username + favorites). */
const forceFavoritesPick = async () => {
  if (!forcePickEnabled) return;
  enterGeneration += 1;
  welcomeOpen.value = false;
  entering.value = false;
  try {
    if (!auth.user) await auth.boot();
    if (!auth.user) return;
    armForceOnboardingFlow();
    tour.armForForceOnboarding();
  } catch {
    return;
  }
  await router.replace({
    name: "discover",
    query: { [FORCE_FAVORITES_PICK_QUERY]: "1" },
  });
};
</script>

<style scoped>
.landing {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  color: var(--text-primary);
}

.landing-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding: calc(var(--app-brand-row) + 0.85rem) 0
    calc(1.25rem + env(safe-area-inset-bottom, 0px));
}

.landing-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
  max-width: 26rem;
  margin-inline: auto;
  padding-inline: 1.25rem;
  flex: 1;
  gap: 0;
}

.landing-kicker {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}

.landing-title {
  margin: 0 0 0.85rem;
  font-size: clamp(1.35rem, 4.2vw, 1.65rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-primary);
}

.landing-lead {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-enter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: auto;
  flex-shrink: 0;
  margin-top: 1.75rem;
  margin-bottom: 0;
  padding: 1.2rem 1.65rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 0 18px rgba(255, 255, 255, 0.35),
    0 0 36px rgba(255, 255, 255, 0.18);
  -webkit-tap-highlight-color: transparent;
}

.landing-enter:hover:not(:disabled) {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 0 22px rgba(255, 255, 255, 0.45),
    0 0 44px rgba(255, 255, 255, 0.22);
}

.landing-enter:disabled {
  opacity: 0.7;
  cursor: wait;
}

.landing-enter-prefix {
  color: #fff;
  font-weight: 600;
}

.landing-enter :deep(.brand-wordmark) {
  font-size: 1.2rem;
}

.landing-marquee {
  width: 100vw;
  max-width: none;
  flex-shrink: 0;
  margin-top: 1.25rem;
  margin-inline: calc(50% - 50vw);
  padding-block: 0.5rem 1.25rem;
}

.landing-social {
  margin-top: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.landing-attr {
  width: 100%;
  max-width: 26rem;
  margin-inline: auto;
  padding-inline: 1.25rem;
  border-top: none;
  text-align: left;
  flex-shrink: 0;
}
</style>
