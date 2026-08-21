<template>
  <component
    :is="interactive ? 'button' : 'div'"
    type="button"
    class="user-chip"
    :class="{ interactive }"
    @click="onClick"
  >
    <Identicon :address="address" :size="size" alt="" />
    <span v-if="showLabel" class="user-chip-label">{{ label }}</span>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { displayName } from "@cinima/shared";
import Identicon from "@/components/Identicon.vue";

const props = withDefaults(
  defineProps<{
    address: string;
    handle?: string | null;
    size?: number;
    showLabel?: boolean;
    interactive?: boolean;
  }>(),
  {
    handle: null,
    size: 28,
    showLabel: true,
    interactive: true,
  }
);

const emit = defineEmits<{
  click: [wallet: string];
}>();

const label = computed(() => displayName(props.handle, props.address));

function onClick(e: Event) {
  if (!props.interactive) return;
  e.stopPropagation();
  emit("click", props.address);
}
</script>

<style scoped>
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
}

.user-chip.interactive {
  cursor: pointer;
}

.user-chip-label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
