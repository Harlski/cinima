<template>
  <div class="landing">
    <AppBrandHeader fixed />

    <div class="landing-main">
      <div class="landing-stack">
        <p class="landing-kicker">{{ landingCopy.kicker }}</p>
        <h1 class="landing-title">{{ landingCopy.title }}</h1>
        <p class="landing-lead">{{ landingCopy.lead }}</p>
        <p class="landing-pay-note">{{ landingCopy.payOnly }}</p>
        <a :href="payUrl" class="nq-pill-blue nq-pill-lg nq-pill-stretch landing-cta">
          {{ landingCopy.cta }}
        </a>

        <div class="unavailable-card">
          <h2 class="unavailable-heading">{{ unavailableCopy.heading }}</h2>
          <p class="unavailable-message">
            {{ unavailableCopy.lead }}
            <a class="unavailable-email" :href="inquiriesMailto()">{{
              INQUIRIES_EMAIL
            }}</a>
          </p>
          <SocialPlaceholders class="unavailable-social" />
          <button
            v-if="showRetry"
            type="button"
            class="nq-pill-secondary retry"
            @click="retry"
          >
            Retry
          </button>
        </div>
      </div>

      <TmdbAttribution variant="compact" class="landing-attr" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppBrandHeader from "@/components/AppBrandHeader.vue";
import SocialPlaceholders from "@/components/SocialPlaceholders.vue";
import TmdbAttribution from "@/components/TmdbAttribution.vue";
import {
  INQUIRIES_EMAIL,
  inquiriesMailto,
  landingCopy,
  unavailableCopy,
} from "@/lib/contact";
import { payOpenHttpsUrl } from "@/lib/payLinks";
import { isNimiqPay } from "@/lib/nimiqPay";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const showRetry = computed(() => isNimiqPay() && !auth.user);

const payUrl = computed(() => payOpenHttpsUrl());

onMounted(() => {
  if (auth.user) router.replace({ name: "discover" });
});

const retry = async () => {
  await auth.boot();
  if (auth.user) {
    await router.replace({ name: "discover" });
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
  justify-content: center;
  gap: 1.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  padding: calc(var(--app-brand-row) + 1.25rem) 1.25rem
    calc(1.25rem + env(safe-area-inset-bottom, 0px));
}

.landing-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  max-width: 26rem;
  margin-inline: auto;
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
  margin: 0 0 0.9rem;
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.landing-pay-note {
  margin: 0 0 1.25rem;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-secondary);
}

.landing-cta {
  margin-bottom: 1.75rem;
  text-align: center;
  letter-spacing: 0.02em;
  color: #fff;
  text-decoration: none;
}

.unavailable-card {
  width: 100%;
  padding: 1.5rem 1.35rem 1.35rem;
  border-radius: 0.75rem;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  text-align: center;
}

.unavailable-heading {
  margin: 0 0 0.65rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
}

.unavailable-message {
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.55;
  color: var(--text-secondary);
}

.unavailable-email {
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
  -webkit-user-select: text;
  user-select: text;
}

.unavailable-email:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.unavailable-social {
  margin-top: 1.25rem;
}

.retry {
  margin-top: 1rem;
}

.landing-attr {
  width: 100%;
  max-width: 26rem;
  margin-inline: auto;
  border-top: none;
  text-align: left;
  flex-shrink: 0;
}
</style>
