<template>
  <div class="gate">
    <AppBrandHeader fixed />
    <div class="gate-content">
      <h1 class="gate-heading">{{ unavailableCopy.heading }}</h1>
      <p class="gate-message">
        {{ unavailableCopy.lead }}
        <a class="gate-email" :href="inquiriesMailto()">{{ INQUIRIES_EMAIL }}</a>
      </p>
      <SocialPlaceholders class="gate-social" />
      <button
        v-if="showRetry"
        type="button"
        class="nq-pill-secondary retry"
        @click="retry"
      >
        Retry
      </button>
      <TmdbAttribution variant="compact" class="gate-attr" />
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
  unavailableCopy,
} from "@/lib/contact";
import { isNimiqPay } from "@/lib/nimiqPay";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();

const showRetry = computed(() => isNimiqPay() && !auth.user);

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
.gate {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: calc(var(--app-brand-row) + 2rem) 2rem 2rem;
}

.gate-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 400px;
  margin-inline: auto;
  width: 100%;
}

.gate-heading {
  margin: 0 0 0.85rem;
  font-size: 1.45rem;
  font-weight: 700;
  color: var(--text-primary);
}

.gate-message {
  font-size: 1.05rem;
  color: var(--text-secondary);
  margin-bottom: 0;
  line-height: 1.6;
}

.gate-email {
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
  -webkit-user-select: text;
  user-select: text;
}

.gate-email:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.gate-social {
  margin-top: 1.75rem;
}

.retry {
  margin-top: 1rem;
}

.gate-attr {
  margin-top: auto;
  padding-top: 2rem;
  padding-bottom: 0.5rem;
  border-top: none;
  text-align: left;
  max-width: 22rem;
}
</style>
