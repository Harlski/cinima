<template>
  <div class="confirm-modal" role="presentation" @click.self="$emit('cancel')">
    <div
      class="confirm-dialog nq-card"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <h2 :id="titleId">{{ message }}</h2>
      <div class="confirm-actions">
        <button type="button" class="nq-pill-secondary nq-pill-lg" @click="$emit('cancel')">
          No
        </button>
        <button type="button" class="nq-pill-blue nq-pill-lg" @click="$emit('confirm')">
          Yes
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  message: string;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();

const titleId = useId();
</script>

<style scoped>
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  background: color-mix(in oklch, var(--colors-neutral) 28%, transparent);
}

.confirm-dialog {
  width: min(100%, 22rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.35rem 1.25rem 1.25rem;
  text-align: center;
}

.confirm-dialog h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--text-primary);
}

.confirm-actions {
  display: flex;
  gap: 0.65rem;
  justify-content: center;
}

.confirm-actions .nq-pill-lg {
  flex: 1;
  max-width: 8rem;
}
</style>
