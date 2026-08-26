<template>
  <div
    class="gold-glow-shell"
    :class="{ 'gold-glow-shell--soft': soft }"
    :style="shellStyle"
  >
    <div class="gold-glow-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** CSS border-radius for the frame (matches the slotted surface). */
    radius?: string;
    /** Soft blurred halo behind the rotating outline (share cards). */
    soft?: boolean;
  }>(),
  {
    radius: "12px",
    soft: true,
  }
);

const shellStyle = computed(() => ({
  "--gold-glow-radius": props.radius,
}));
</script>

<style scoped>
.gold-glow-shell {
  position: relative;
  border-radius: var(--gold-glow-radius, 12px);
  flex-shrink: 0;
}

.gold-glow-shell--soft::before,
.gold-glow-shell::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  pointer-events: none;
  background: conic-gradient(
    from var(--gold-glow-angle, 0deg),
    transparent 0deg 195deg,
    color-mix(in oklch, var(--gold) 20%, transparent) 230deg,
    var(--gold) 270deg,
    #ffe9a8 295deg,
    var(--gold) 325deg,
    transparent 360deg
  );
  animation: gold-glow-spin 5.5s linear infinite;
}

.gold-glow-shell--soft::before {
  z-index: 0;
  inset: -8px;
  filter: blur(12px);
  opacity: 0.65;
}

.gold-glow-shell::after {
  z-index: 0;
  inset: -2px;
  padding: 1.5px;
  opacity: 0.95;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.gold-glow-content {
  position: relative;
  z-index: 1;
  border-radius: inherit;
}

@property --gold-glow-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes gold-glow-spin {
  to {
    --gold-glow-angle: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gold-glow-shell--soft::before,
  .gold-glow-shell::after {
    animation: none;
  }
}
</style>
