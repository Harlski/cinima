<template>
  <span class="nq-spinner" role="status">
    <!--
      Keyguard paired-hex loader (MIT).
      github.com/nimiq/keyguard — src/common.css + request/*/index.html
    -->
    <svg
      class="loading-spinner"
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="svgHeight"
      viewBox="0 0 54 48"
      color="inherit"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        stroke-width="3"
        fill="none"
        stroke-linecap="round"
      >
        <path
          class="big-hex"
          d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
          opacity="0.4"
          stroke-dasharray="92.5 60"
        />
        <path
          class="small-hex"
          d="M51.9,21.9L41.3,3.6c-0.8-1.3-2.2-2.1-3.7-2.1H16.4c-1.5,0-2.9,0.8-3.7,2.1L2.1,21.9c-0.8,1.3-0.8,2.9,0,4.2 l10.6,18.3c0.8,1.3,2.2,2.1,3.7,2.1h21.3c1.5,0,2.9-0.8,3.7-2.1l10.6-18.3C52.7,24.8,52.7,23.2,51.9,21.9z"
          stroke-dasharray="47.5 105"
        />
      </g>
    </svg>
    <span class="nq-spinner-label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    size?: number;
    label?: string;
  }>(),
  {
    size: 54,
    label: "Loading",
  }
);

const svgHeight = computed(() => (props.size * 48) / 54);
</script>

<style scoped>
.nq-spinner {
  position: relative;
  display: inline-flex;
  color: inherit;
}

.nq-spinner-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.loading-spinner .big-hex {
  stroke-dashoffset: -40.5;
  animation: loading-big-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

.loading-spinner .small-hex {
  stroke-dashoffset: 13;
  animation: loading-small-hex 4s cubic-bezier(0.76, 0.29, 0.29, 0.76) infinite;
}

@keyframes loading-big-hex {
  0% {
    stroke-dashoffset: -40.5;
  }
  17% {
    stroke-dashoffset: -15.08;
  }
  33% {
    stroke-dashoffset: 10.33;
  }
  50% {
    stroke-dashoffset: 35.75;
  }
  67% {
    stroke-dashoffset: 61.17;
  }
  83% {
    stroke-dashoffset: 86.58;
  }
  100% {
    stroke-dashoffset: 112;
  }
}

@keyframes loading-small-hex {
  0% {
    stroke-dashoffset: 13;
  }
  17% {
    stroke-dashoffset: 38.42;
  }
  33% {
    stroke-dashoffset: 63.84;
  }
  50% {
    stroke-dashoffset: 89.25;
  }
  67% {
    stroke-dashoffset: 114.66;
  }
  83% {
    stroke-dashoffset: 140.08;
  }
  100% {
    stroke-dashoffset: 165.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner .big-hex,
  .loading-spinner .small-hex {
    animation: none;
  }
}
</style>
