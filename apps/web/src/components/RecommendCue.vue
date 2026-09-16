<template>
  <div class="recommend-cue" data-scroll-trap role="status" aria-live="polite">
    <div class="recommend-cue-bar">
      <p class="recommend-cue-copy">{{ titleName }} now recommended</p>
      <button type="button" class="nq-pill-gold recommend-cue-share" @click="$emit('share')">
        Share?
      </button>
      <button
        type="button"
        class="recommend-cue-x"
        aria-label="Dismiss"
        @click="$emit('dismiss')"
      >
        <NqIcon name="cross" :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import NqIcon from "@/components/NqIcon.vue";

defineProps<{
  titleName: string;
}>();

defineEmits<{
  share: [];
  dismiss: [];
}>();
</script>

<style scoped>
.recommend-cue {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--bottom-tabs-inset);
  z-index: 49;
  pointer-events: none;
  animation: recommend-cue-in 0.28s ease-out;
}

@keyframes recommend-cue-in {
  from {
    transform: translateY(110%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.recommend-cue-bar {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 2.6rem 0.8rem 1rem;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
}

.recommend-cue-copy {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.recommend-cue-share {
  flex-shrink: 0;
}

.recommend-cue-x {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: grid;
  place-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}
</style>
