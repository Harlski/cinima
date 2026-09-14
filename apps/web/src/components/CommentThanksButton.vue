<template>
  <button
    v-if="!own && !deleted"
    type="button"
    class="comment-thanks"
    :class="{ 'is-thanked': thanked && sent }"
    :disabled="busy || (thanked && sent)"
    :aria-busy="busy"
    @click="onClick"
  >
    {{ thanked && sent ? "Thanked" : thanked ? userSendCta : "Thanks" }}
    <span v-if="count > 0">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
import { USER_SEND_CTA } from "@cinima/shared";

const userSendCta = USER_SEND_CTA;
const props = withDefaults(
  defineProps<{
    own: boolean;
    deleted: boolean;
    thanked: boolean;
    sent?: boolean;
    count: number;
    busy?: boolean;
  }>(),
  { busy: false, sent: false }
);

const emit = defineEmits<{
  thank: [];
  send: [];
}>();

function onClick() {
  if (props.thanked) emit("send");
  else emit("thank");
}
</script>

<style scoped>
.comment-thanks {
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.comment-thanks:hover:not(:disabled) {
  text-decoration: underline;
}

.comment-thanks:disabled {
  cursor: default;
}

.comment-thanks.is-thanked {
  color: var(--gold);
}

.comment-thanks span {
  color: var(--text-secondary);
  font-weight: 600;
}
</style>
