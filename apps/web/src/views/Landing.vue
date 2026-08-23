<template>
  <div class="landing">
    <AppBrandHeader fixed />

    <div class="landing-main">
      <TitleMarquee class="landing-marquee" />

      <div class="landing-stack">
        <p class="landing-kicker">{{ landingCopy.kicker }}</p>
        <h1 class="landing-title">{{ landingCopy.title }}</h1>
        <p class="landing-lead">{{ landingCopy.lead }}</p>

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
        <a
          v-else
          :href="payUrl"
          class="nq-pill-blue nq-pill-lg nq-pill-stretch landing-cta"
        >
          {{ landingCopy.ctaExplore }}
        </a>

        <SocialPlaceholders class="landing-social" />
      </div>

      <TmdbAttribution variant="compact" class="landing-attr" />
    </div>

    <WelcomeOverlay
      :open="welcomeOpen"
      :wallet-address="welcomeWallet"
      :message="welcomeText"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import BrandWordmark from "@/components/BrandWordmark.vue";
import SocialPlaceholders from "@/components/SocialPlaceholders.vue";
import TitleMarquee from "@/components/TitleMarquee.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import WelcomeOverlay from "@/components/WelcomeOverlay.vue";
import { landingCopy } from "@/lib/contact";
import { payOpenHttpsUrl } from "@/lib/payLinks";
import { detectNimiqPay, isNimiqPay, isNimiqPayUserAgent } from "@/lib/nimiqPay";
import {
  WELCOME_FADE_MS,
  WELCOME_HOLD_MS,
  isReturningUser,
  sleep,
  welcomeMessage,
} from "@/lib/welcome";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const inPay = ref(isNimiqPay() || isNimiqPayUserAgent());
const entering = ref(false);
const welcomeOpen = ref(false);
const welcomeWallet = ref("");
const welcomeText = ref<ReturnType<typeof welcomeMessage>>("Welcome!");

const payUrl = computed(() => payOpenHttpsUrl());

let cancelled = false;

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
 * then enter Discover (onboarding or For You).
 */
const enterCinima = async () => {
  if (entering.value) return;
  entering.value = true;
  const hadToken = !!auth.token;
  try {
    await auth.boot();
    if (cancelled) return;
    if (!auth.user) return;

    welcomeWallet.value = auth.user.walletAddress;
    welcomeText.value = welcomeMessage({
      returning: isReturningUser({
        hadToken,
        handle: auth.user.handle,
        favoriteCount: auth.user.favoriteCount,
      }),
    });
    welcomeOpen.value = true;
    await sleep(WELCOME_HOLD_MS);
    if (cancelled) return;

    welcomeOpen.value = false;
    await sleep(WELCOME_FADE_MS);
    if (cancelled) return;

    await router.replace({ name: "discover" });
  } finally {
    if (!cancelled) entering.value = false;
  }
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

.landing-marquee {
  width: 100%;
  flex-shrink: 0;
  padding-block: 0.5rem 0.35rem;
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
  margin: 0 0 1.35rem;
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
  margin-bottom: 1.5rem;
  padding: 1.2rem 1.65rem;
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  background: var(--colors-neutral-200);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  -webkit-tap-highlight-color: transparent;
}

.landing-enter:hover:not(:disabled) {
  background: var(--colors-neutral-300, var(--colors-neutral-200));
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

.landing-cta {
  margin-bottom: 1.5rem;
  text-align: center;
  letter-spacing: 0.02em;
  color: #fff;
  text-decoration: none;
}

.landing-social {
  margin-top: 0;
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
