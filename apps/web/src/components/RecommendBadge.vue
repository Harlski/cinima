<template>
  <span class="recommend-badge" aria-hidden="true">
    <svg
      class="hex"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1.2 -1.2 20.4 19.4"
      :width="size"
      :height="hexHeight"
    >
      <path
        class="hex-fill"
        d="m17.045 7.563-3.429-6.09a1.37 1.37 0 00-1.189-.702H5.57c-.489 0-.941.267-1.186.703L.954 7.563a1.44 1.44 0 000 1.405l3.43 6.088a1.36 1.36 0 001.186.703h6.858a1.36 1.36 0 001.186-.703l3.43-6.088c.246-.436.246-.97.001-1.405Z"
      />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    size?: number;
  }>(),
  { size: 28 }
);

const hexHeight = computed(() => Math.round((props.size * 17) / 18));
</script>

<style scoped>
.recommend-badge {
  position: absolute;
  top: 0.22rem;
  right: 0.22rem;
  z-index: 2;
  display: grid;
  place-items: center;
  color: var(--gold);
  line-height: 0;
  filter:
    drop-shadow(0 0 0.5px #000)
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.75));
}

.hex-fill {
  fill: currentColor;
  stroke: #0a0a0f;
  stroke-width: 1.35;
  stroke-linejoin: round;
  paint-order: stroke fill;
}
</style>
