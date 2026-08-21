<template>
  <div class="gate">
    <div class="gate-content">
      <div class="gate-logo">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="100" height="100" rx="20" fill="url(#grad)" />
          <path d="M30 50 L50 30 L70 50 L50 70 Z" fill="white" opacity="0.9" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stop-color="#e74c3c" />
              <stop offset="100%" stop-color="#c0392b" />
            </linearGradient>
          </defs>
        </svg>
        <h1><BrandWordmark size="lg" /></h1>
      </div>
      <p class="gate-message">
        This app runs inside Nimiq Pay
      </p>
      <a :href="payUrl" class="gate-button">
        Open in Nimiq Pay
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BrandWordmark from "@/components/BrandWordmark.vue";

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
  background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
  padding: 2rem;
}

.gate-content {
  text-align: center;
  max-width: 400px;
}

.gate-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.gate-logo svg {
  width: 80px;
  height: 80px;
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

.gate-button {
  display: inline-block;
  padding: 1rem 2rem;
  background: var(--primary);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s;
}

.gate-button:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(231, 76, 60, 0.3);
}
</style>
