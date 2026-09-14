<template>
  <div v-if="!own && !deleted" class="thanks-actions">
    <button
      type="button"
      class="thanks-action"
      :class="{ 'is-done': thanked }"
      :disabled="busy || thanked"
      :aria-busy="busy && !thanked"
      :aria-pressed="thanked"
      @click="$emit('thank')"
    >
      Thanks
      <span v-if="count > 0">{{ count }}</span>
    </button>
    <button
      v-if="thanked"
      type="button"
      class="thanks-action thanks-action--send"
      :class="{ 'is-sent': sent }"
      :disabled="busy || sent"
      :aria-busy="busy && thanked && !sent"
      @click="$emit('send')"
    >
      {{ sent ? "Sent" : sendLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { USER_SEND_SHORT_CTA } from "@cinima/shared";

withDefaults(
  defineProps<{
    own: boolean;
    deleted: boolean;
    thanked: boolean;
    sent?: boolean;
    count: number;
    busy?: boolean;
    sendLabel?: string;
  }>(),
  {
    sent: false,
    busy: false,
    sendLabel: USER_SEND_SHORT_CTA,
  }
);

defineEmits<{
  thank: [];
  send: [];
}>();
</script>

<style scoped>
.thanks-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.thanks-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--primary);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.thanks-action:hover:not(:disabled) {
  text-decoration: underline;
}

.thanks-action:disabled {
  cursor: default;
}

.thanks-action.is-done,
.thanks-action.is-sent,
.thanks-action--send {
  color: var(--gold);
}

.thanks-action span {
  color: var(--text-secondary);
  font-weight: 600;
}
</style>
