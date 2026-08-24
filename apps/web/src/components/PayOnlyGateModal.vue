<template>
  <div class="pay-only-modal" role="presentation" @click.self="$emit('close')">
    <div
      class="pay-only-dialog nq-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-only-title"
    >
      <button type="button" class="pay-only-close" aria-label="Close" @click="$emit('close')">
        <NqIcon name="cross" :size="20" />
      </button>

      <h2 id="pay-only-title">{{ payOnlyGateCopy.title }}</h2>
      <p class="pay-only-body">{{ payOnlyGateCopy.body }}</p>

      <PayOnlyActions
        :already-installed-url="alreadyInstalledUrl"
        :social-variant="socialVariant"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import NqIcon from "@/components/NqIcon.vue";
import PayOnlyActions from "@/components/PayOnlyActions.vue";
import { payOnlyGateCopy } from "@/lib/contact";

withDefaults(
  defineProps<{
    alreadyInstalledUrl: string;
    socialVariant?: "landing" | "payGate";
  }>(),
  {
    socialVariant: "landing",
  }
);

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
.pay-only-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.pay-only-dialog {
  position: relative;
  width: min(100%, 24rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2.25rem 1.75rem 1.75rem;
  text-align: center;
  background-color: color-mix(in oklch, var(--colors-neutral-50) 72%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.pay-only-close {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  padding: 0.35rem;
  border: 0;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.pay-only-dialog h2 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.pay-only-body {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>
