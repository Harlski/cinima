<template>
  <div class="poster-img">
    <div v-if="src && !loaded" class="poster-img-wait">
      <NqSpinner :size="spinnerSize" :label="label" />
    </div>
    <img
      v-if="src"
      ref="imgEl"
      :src="src"
      :alt="alt"
      :class="{ 'is-ready': loaded }"
      @load="loaded = true"
      @error="loaded = true"
    />
    <div v-else class="poster-img-fallback">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import NqSpinner from "@/components/NqSpinner.vue";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    spinnerSize?: number;
    label?: string;
  }>(),
  {
    src: null,
    alt: "",
    spinnerSize: 28,
    label: "Loading",
  }
);

const imgEl = ref<HTMLImageElement | null>(null);
const loaded = ref(false);

watch(
  () => props.src,
  async () => {
    loaded.value = false;
    await nextTick();
    if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) {
      loaded.value = true;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.poster-img {
  position: relative;
  width: 100%;
  height: 100%;
}

.poster-img-wait {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  pointer-events: none;
  z-index: 1;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
}

img.is-ready {
  opacity: 1;
}

.poster-img-fallback {
  width: 100%;
  height: 100%;
}
</style>
