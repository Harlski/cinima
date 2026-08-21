<template>
  <div class="gate">
    <div class="gate-content">
      <div class="gate-logo">
        <NqIcon name="logos-nimiq-hexagon-outline-mono" :size="80" class="gate-hex" />
        <h1><BrandWordmark size="lg" /></h1>
      </div>
      <p class="gate-message">
        This app runs inside Nimiq Pay
      </p>
      <a :href="payUrl" class="nq-pill-blue nq-pill-lg">
        Open in Nimiq Pay
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BrandWordmark from "@/components/BrandWordmark.vue";
import NqIcon from "@/components/NqIcon.vue";

const payUrl = computed(() => {
  const base = import.meta.env.VITE_PAY_APP_URL || "https://pay.nimiq.com";
  return `${base}?app=${encodeURIComponent(window.location.origin)}`;
});
</script>

<style scoped>
.gate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  background: var(--bg-primary);
  padding: 2rem;
}

.gate-content {
  text-align: center;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gate-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.gate-hex {
  color: var(--gold);
}

.gate-logo h1 {
  margin: 0;
  line-height: 1;
}

.gate-message {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.gate-content a {
  text-decoration: none;
}
</style>
